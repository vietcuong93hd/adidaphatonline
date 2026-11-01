const test = require('node:test');
const assert = require('node:assert');
const { GameRoom } = require('../lib/gameRoom');
const { NpcCrowd, TARGET_PRESENT } = require('../lib/npcs');

function setup() {
  let time = 100000;
  const now = () => time;
  const room = new GameRoom(now);
  const crowd = new NpcCrowd(room, { now });
  const run = (ticks) => {
    for (let i = 0; i < ticks; i += 1) {
      time += 100;
      crowd.update(0.1);
      room.tick();
    }
  };
  const connect = () => {
    const conn = { sent: [], send(message) { this.sent.push(message); } };
    room.handle(conn, { t: 'profile', name: 'An' });
    return conn;
  };
  return { room, crowd, run, connect };
}

test('luôn đủ 15 người trong chùa, người thật vào thì giả lập rút bớt', () => {
  const { room, crowd, run, connect } = setup();
  run(TARGET_PRESENT + 2);
  assert.strictEqual(room.players.size, TARGET_PRESENT);

  const conns = [connect(), connect(), connect()];
  run(5);
  assert.strictEqual(room.players.size, TARGET_PRESENT);
  assert.strictEqual(crowd.npcs.length, TARGET_PRESENT - 3);

  room.disconnect(conns[0]);
  run(5);
  assert.strictEqual(room.players.size, TARGET_PRESENT);
});

test('đủ người thật thì không còn giả lập', () => {
  const { room, crowd, run, connect } = setup();
  for (let i = 0; i < TARGET_PRESENT + 2; i += 1) connect();
  run(5);
  assert.strictEqual(crowd.npcs.length, 0);
  assert.strictEqual(room.players.size, TARGET_PRESENT + 2);
});

test('giả lập đi tới bồ đoàn riêng rồi ngồi', () => {
  const { room, crowd, run } = setup();
  run(TARGET_PRESENT + 450);

  const inHall = crowd.npcs.filter((npc) => !npc.inYard);
  assert.strictEqual(new Set(inHall.map((npc) => npc.cushion)).size, inHall.length);
  const seated = inHall.filter((npc) => room.players.get(npc.conn).sitting);
  assert.ok(seated.length >= inHall.length - 2);
});

test('một phần đồng tu tìm dép ngoài sân và luôn ở lối đi hợp lệ', () => {
  const { room, crowd, run, connect } = setup();
  const conn = connect();
  run(TARGET_PRESENT + 600);
  assert.ok(conn.sent.some((message) => message.t === 'bubble'));

  const strollers = crowd.npcs.filter((npc) => npc.inYard);
  assert.ok(strollers.length >= 3);
  for (const npc of strollers) {
    const player = room.players.get(npc.conn);
    assert.ok(player.z >= 30 && Math.abs(player.x) <= 4);
    assert.strictEqual(player.sitting, false);
  }
});

test('giả lập không làm tăng số liệu thật', () => {
  const { room, run, connect } = setup();
  const conn = connect();
  run(1500);

  assert.deepStrictEqual(room.snapshot(), { totalNiem: 0, totalHuong: 0, totalDen: 0 });
  assert.ok(conn.sent.some((message) => message.t === 'pulse'));
  assert.ok(!conn.sent.some((message) => ['chat', 'den', 'huong'].includes(message.t)));
});

test('giả lập không làm chùa đầy với người thật', () => {
  const { room, run, connect } = setup();
  run(20);
  for (let i = 0; i < 49; i += 1) {
    connect();
    run(2);
  }
  assert.ok(!connect().sent.some((message) => message.t === 'full'));
});
