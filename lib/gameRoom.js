const { cleanText, isBlocked } = require('./rituals');

const MAX_PLAYERS = 100;
const MAX_NAME_LENGTH = 20;
const MAX_CHAT_LENGTH = 100;
const FORMS = new Set(['trau', 'ngua', 'ong', 'chimlon', 'naga', 'luon', 'fox', 'ga', 'tho', 'tacke', 'cu', 'bao']);
const DEFAULT_FORM = 'trau';
const DEFAULT_NAME = 'Bạn ẩn danh';

// Phải khớp public/js/game/walk.js: chánh điện, cửa chính, sân chùa
const WALK_RECTS = [
  { minX: -18, maxX: 18, minZ: -14.5, maxZ: 21 },
  { minX: -3.5, maxX: 3.5, minZ: 21, maxZ: 30 },
  { minX: -58, maxX: 58, minZ: 30, maxZ: 106 }
];
// Phải khớp TOUR_SPOTS trong public/js/game/tour.js
const TOUR_SPOTS = {
  chanhdien: { x: 0, z: 18 },
  san: { x: 0, z: 42 }
};
const SPAWN = { x: 0, z: 16 };
const MAX_SPEED = 7; // tốc độ đi 5, chừa khoảng cho mạng trễ

const CHAT_INTERVAL_MS = 1500;
const NIEM_INTERVAL_MS = 400;
const RITUAL_INTERVAL_MS = 5000;
const ROUND_SIZE = 108;
const MAX_WISH_LENGTH = 80;
const DONG_TAM_WINDOW_MS = 10000;

const isWalkable = (x, z) => WALK_RECTS.some((r) => x >= r.minX && x <= r.maxX && z >= r.minZ && z <= r.maxZ);

function cleanName(raw) {
  const name = cleanText(raw, MAX_NAME_LENGTH);
  return name && !isBlocked(name) ? name : DEFAULT_NAME;
}

function publicPlayer({ id, name, form, x, z, ry, moving, sitting }) {
  return { id, name, form, x, z, ry, moving, sitting };
}

const round = (value) => Math.round(value * 100) / 100;

// Gói vị trí gửi liên tục nên dùng mảng cho nhẹ: [id, x, z, ry, cờ]; cờ 1 là đang đi, 2 là đang ngồi
function packPosition({ id, x, z, ry, moving, sitting }) {
  return [id, round(x), round(z), round(ry), (moving ? 1 : 0) + (sitting ? 2 : 0)];
}

class GameRoom {
  constructor(now = Date.now, saved = {}) {
    this.now = now;
    this.players = new Map();
    this.nextId = 1;
    this.totalNiem = Number(saved.totalNiem) || 0;
    this.totalHuong = Number(saved.totalHuong) || 0;
    this.totalDen = Number(saved.totalDen) || 0;
    this.changed = false;
    this.recentNiem = new Map();
    this.dongTam = 0;
  }

  handle(conn, message) {
    if (!message || typeof message !== 'object') return;
    const player = this.players.get(conn);

    if (message.t === 'profile') {
      if (player) this.updateProfile(player, message);
      else this.join(conn, message);
    } else if (player && message.t === 'move') {
      this.move(player, message);
    } else if (player && message.t === 'chat') {
      this.chat(player, message.text);
    } else if (player && message.t === 'niem') {
      this.niem(player);
    } else if (player && message.t === 'huong') {
      this.huong(player, message.wish);
    } else if (player && message.t === 'den') {
      this.den(player, message.wish);
    } else if (player && message.t === 'travel') {
      this.travel(player, message.spot);
    }
  }

  // Đi nhanh chỉ được tới các điểm tham quan có sẵn
  travel(player, spot) {
    if (!Object.hasOwn(TOUR_SPOTS, spot)) return;
    Object.assign(player, TOUR_SPOTS[spot], { lastMoveAt: null, sitting: false, positionChanged: true });
  }

  snapshot() {
    const { totalNiem, totalHuong, totalDen } = this;
    return { totalNiem, totalHuong, totalDen };
  }

  join(conn, { name, form }) {
    if (this.players.size >= MAX_PLAYERS) {
      conn.send({ t: 'full' });
      return;
    }

    const player = {
      id: this.nextId,
      conn,
      name: cleanName(name),
      form: FORMS.has(form) ? form : DEFAULT_FORM,
      ...SPAWN,
      ry: Math.PI,
      moving: false,
      sitting: false,
      positionChanged: false,
      lastMoveAt: null,
      lastChatAt: 0,
      lastNiemAt: 0,
      lastRitualAt: 0
    };
    this.nextId += 1;

    conn.send({
      t: 'welcome',
      id: player.id,
      name: player.name,
      players: [...this.players.values()].map(publicPlayer),
      ...this.snapshot(),
      dongTam: this.dongTam
    });
    this.broadcast({ t: 'join', player: publicPlayer(player) });
    this.players.set(conn, player);
  }

  updateProfile(player, { name, form }) {
    player.name = cleanName(name);
    if (FORMS.has(form)) player.form = form;
    this.broadcast({ t: 'profile', id: player.id, name: player.name, form: player.form });
  }

  move(player, { x, z, ry, moving, sitting }) {
    if (![x, z, ry].every(Number.isFinite)) return;

    const now = this.now();
    let dx = x - player.x;
    let dz = z - player.z;

    // Lần đầu cho phép đặt vị trí để người nối lại không bị kéo về cửa chùa
    if (player.lastMoveAt !== null) {
      const seconds = Math.max(0.1, (now - player.lastMoveAt) / 1000);
      const allowed = MAX_SPEED * seconds;
      const distance = Math.hypot(dx, dz);
      if (distance > allowed) {
        dx *= allowed / distance;
        dz *= allowed / distance;
      }
    }

    player.lastMoveAt = now;
    if (!isWalkable(player.x + dx, player.z + dz)) return;

    const next = { ry, moving: Boolean(moving), sitting: Boolean(sitting) };
    if (dx || dz || next.ry !== player.ry || next.moving !== player.moving || next.sitting !== player.sitting) {
      player.positionChanged = true;
    }
    player.x += dx;
    player.z += dz;
    Object.assign(player, next);
  }

  chat(player, rawText) {
    const now = this.now();
    if (now - player.lastChatAt < CHAT_INTERVAL_MS) return;

    const text = cleanText(rawText, MAX_CHAT_LENGTH);
    if (!text || isBlocked(text)) return;

    player.lastChatAt = now;
    this.broadcast({ t: 'chat', id: player.id, name: player.name, text });
  }

  niem(player) {
    const now = this.now();
    if (now - player.lastNiemAt < NIEM_INTERVAL_MS) return;

    player.lastNiemAt = now;
    this.totalNiem += 1;
    this.changed = true;
    this.recentNiem.set(player.id, now);
    this.dongTam = this.countDongTam(now);
    this.broadcast({
      t: 'niem',
      id: player.id,
      totalNiem: this.totalNiem,
      dongTam: this.dongTam,
      round: this.totalNiem % ROUND_SIZE === 0
    });
  }

  canDoRitual(player) {
    const now = this.now();
    if (now - player.lastRitualAt < RITUAL_INTERVAL_MS) return false;
    player.lastRitualAt = now;
    return true;
  }

  // Lời khấn không bắt buộc, nhưng đã viết thì phải qua bộ lọc như lời nguyện trên đèn
  huong(player, rawWish) {
    const wish = cleanText(rawWish, MAX_WISH_LENGTH);
    if (wish && isBlocked(wish)) return;
    if (!this.canDoRitual(player)) return;
    this.totalHuong += 1;
    this.changed = true;
    this.broadcast({ t: 'huong', id: player.id, name: player.name, wish, totalHuong: this.totalHuong });
  }

  den(player, rawWish) {
    const wish = cleanText(rawWish, MAX_WISH_LENGTH);
    if (!wish || isBlocked(wish) || !this.canDoRitual(player)) return;
    this.totalDen += 1;
    this.changed = true;
    this.broadcast({
      t: 'den',
      id: player.id,
      name: player.name,
      wish,
      x: player.x,
      z: player.z,
      totalDen: this.totalDen
    });
  }

  countDongTam(now) {
    for (const [id, time] of this.recentNiem) {
      if (now - time > DONG_TAM_WINDOW_MS) this.recentNiem.delete(id);
    }
    return this.recentNiem.size;
  }

  disconnect(conn) {
    const player = this.players.get(conn);
    if (!player) return;

    this.players.delete(conn);
    this.recentNiem.delete(player.id);
    this.broadcast({ t: 'leave', id: player.id });
  }

  tick() {
    const dongTam = this.countDongTam(this.now());
    if (dongTam !== this.dongTam) {
      this.dongTam = dongTam;
      this.broadcast({ t: 'dongTam', dongTam });
    }
  }

  // Chỉ gửi người vừa đổi vị trí; người mới vào đã có đủ danh sách trong welcome
  sendPositions() {
    const changed = [...this.players.values()].filter((player) => player.positionChanged);
    if (!changed.length) return;
    for (const player of changed) player.positionChanged = false;
    this.broadcast({ t: 'state', players: changed.map(packPosition) });
  }

  broadcast(message) {
    for (const conn of this.players.keys()) conn.send(message);
  }
}

module.exports = { GameRoom, MAX_PLAYERS };
