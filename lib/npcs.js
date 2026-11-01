const TARGET_PRESENT = 15;
const WALK_SPEED = 3;
const ARRIVE_DISTANCE = 0.2;
const SIT_MIN_MS = 20000;
const SIT_MAX_MS = 60000;
const CHANT_MIN_MS = 5000;
const CHANT_MAX_MS = 12000;
const YARD_EVERY = 3; // cứ ba đồng tu thì một người ra sân tìm dép
const SEARCH_MIN_MS = 3000;
const SEARCH_MAX_MS = 8000;
// Phải khớp SHOE_PILE trong public/js/game/yard.js
const SHOE_PILE = { halfWidth: 3.5, minZ: 31, maxZ: 40 };
const SHOE_LINES = [
  'Ủa, dép tôi đâu rồi?',
  'Ai đi nhầm dép tôi vậy!',
  'Đôi này 38, chân tôi 42 mà…',
  'Một chiếc trái, một chiếc trái. Tạm ổn.',
  'Vào lễ Phật, ra buông luôn đôi dép',
  'Sáng đi hai chiếc, trưa về một chiếc',
  'Dép tôi màu xanh… hay màu đỏ nhỉ?',
  'Của mình thì không mất, mất là của… mình thật rồi',
  'Có ai thấy đôi Lào của tôi không?',
  'Anh ơi, đôi đó của em!'
];

const FORM_NAMES = {
  trau: 'Trâu',
  ngua: 'Ngựa',
  ong: 'Ong',
  chimlon: 'Chim lợn',
  naga: 'Mãng xà',
  luon: 'Lươn',
  fox: 'Cáo',
  ga: 'Gà',
  tho: 'Thỏ',
  tacke: 'Tắc kè',
  cu: 'Cú',
  bao: 'Báo'
};
const FORMS = Object.keys(FORM_NAMES);
const TEAMS = ['Kế toán', 'Marketing', 'Nhân sự', 'Sale', 'IT', 'Thiết kế', 'Pháp chế', 'Kho vận'];

// Phải khớp CUSHION_X, CUSHION_Z trong public/js/game/world.js
const CUSHIONS = [-10, -7, -4, -1, 2, 5, 8, 11].flatMap((z) => [-6.8, -4.8, -2.8, 2.8, 4.8, 6.8].map((x) => ({ x, z })));

const pick = (list, random) => list[Math.floor(random() * list.length)];
const between = (min, max, random) => min + random() * (max - min);

// Đồng tu giả lập cho chùa đỡ vắng. Chỉ tạo không khí: không cộng vào số câu niệm thật,
// không chat với người thật và không thả lời nguyện giả. Lời đùa tìm dép chỉ là bong bóng.
class NpcCrowd {
  constructor(room, { now = Date.now, random = Math.random, target = TARGET_PRESENT } = {}) {
    this.room = room;
    this.now = now;
    this.random = random;
    this.target = target;
    this.npcs = [];
    this.taken = new Set();
  }

  realCount() {
    return this.room.players.size - this.npcs.length;
  }

  freeCushion() {
    const free = CUSHIONS.filter((cushion) => !this.taken.has(cushion));
    return free.length ? pick(free, this.random) : null;
  }

  spawn() {
    const conn = { send() {} };
    const form = pick(FORMS, this.random);
    this.room.handle(conn, { t: 'profile', name: `${FORM_NAMES[form]} ${pick(TEAMS, this.random)}`, form });

    const inYard = (this.npcs.length + 1) % YARD_EVERY === 0;
    const npc = {
      conn,
      inYard,
      x: between(-3.5, 3.5, this.random),
      z: inYard ? between(SHOE_PILE.minZ, SHOE_PILE.maxZ, this.random) : between(15, 18, this.random),
      cushion: null,
      sitUntil: 0,
      nextChant: 0
    };
    this.npcs.push(npc);
    this.goToCushion(npc);
    this.send(npc, { moving: false, sitting: false, ry: Math.PI });
  }

  // Lúi húi quanh đống dép trước cửa chánh điện
  yardPoint() {
    return {
      x: between(-SHOE_PILE.halfWidth, SHOE_PILE.halfWidth, this.random),
      z: between(SHOE_PILE.minZ, SHOE_PILE.maxZ, this.random)
    };
  }

  sayShoeLine(npc) {
    const player = this.room.players.get(npc.conn);
    this.room.broadcast({ t: 'bubble', id: player.id, text: pick(SHOE_LINES, this.random) });
  }

  despawn() {
    const npc = this.npcs.pop();
    this.taken.delete(npc.cushion);
    this.room.disconnect(npc.conn);
  }

  goToCushion(npc) {
    if (npc.inYard) {
      npc.cushion = this.yardPoint();
      npc.sitUntil = 0;
      return;
    }
    const next = this.freeCushion();
    if (!next) return;
    this.taken.delete(npc.cushion);
    this.taken.add(next);
    npc.cushion = next;
    npc.sitUntil = 0;
  }

  send(npc, { moving, sitting, ry }) {
    this.room.handle(npc.conn, { t: 'move', x: npc.x, z: npc.z, ry, moving, sitting });
  }

  walk(npc, seconds) {
    const dx = npc.cushion.x - npc.x;
    const dz = npc.cushion.z - npc.z;
    const distance = Math.hypot(dx, dz);

    if (distance <= ARRIVE_DISTANCE) {
      npc.x = npc.cushion.x;
      npc.z = npc.cushion.z;
      npc.sitUntil = this.now() + (npc.inYard
        ? between(SEARCH_MIN_MS, SEARCH_MAX_MS, this.random)
        : between(SIT_MIN_MS, SIT_MAX_MS, this.random));
      npc.nextChant = this.now() + between(0, CHANT_MAX_MS, this.random);
      this.send(npc, { moving: false, sitting: !npc.inYard, ry: Math.PI });
      if (npc.inYard) this.sayShoeLine(npc);
      return;
    }

    const step = Math.min(distance, WALK_SPEED * seconds);
    npc.x += (dx / distance) * step;
    npc.z += (dz / distance) * step;
    this.send(npc, { moving: true, sitting: false, ry: Math.atan2(dx, dz) });
  }

  sit(npc) {
    const now = this.now();
    if (now >= npc.sitUntil) {
      this.goToCushion(npc);
      return;
    }
    if (!npc.inYard && now >= npc.nextChant) {
      npc.nextChant = now + between(CHANT_MIN_MS, CHANT_MAX_MS, this.random);
      const player = this.room.players.get(npc.conn);
      this.room.broadcast({ t: 'pulse', id: player.id });
    }
  }

  update(seconds) {
    const wanted = Math.max(0, this.target - this.realCount());
    if (this.npcs.length < wanted) this.spawn();
    else if (this.npcs.length > wanted) this.despawn();

    for (const npc of this.npcs) {
      if (npc.sitUntil) this.sit(npc);
      else this.walk(npc, seconds);
    }
  }
}

module.exports = { NpcCrowd, TARGET_PRESENT };
