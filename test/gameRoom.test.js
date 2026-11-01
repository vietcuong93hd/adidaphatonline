const test = require('node:test');
const assert = require('node:assert');
const { GameRoom, MAX_PLAYERS } = require('../lib/gameRoom');

function setup() {
  let time = 100000;
  const room = new GameRoom(() => time);
  const connect = (name = 'An', form = 'trau') => {
    const conn = { sent: [], send(message) { this.sent.push(message); } };
    room.handle(conn, { t: 'profile', name, form });
    return conn;
  };
  return { room, connect, advance: (ms) => { time += ms; } };
}

const last = (conn, type) => conn.sent.filter((message) => message.t === type).at(-1);

test('người mới nhận danh sách người cũ, người cũ được báo có người vào', () => {
  const { connect } = setup();
  const first = connect('An');
  const second = connect('Bình', 'fox');

  assert.strictEqual(last(second, 'welcome').players.length, 1);
  assert.strictEqual(last(second, 'welcome').players[0].name, 'An');
  assert.strictEqual(last(first, 'join').player.form, 'fox');
  assert.strictEqual(last(second, 'join'), undefined);
});

test('rời phòng thì báo cho người còn lại', () => {
  const { room, connect } = setup();
  const first = connect();
  const second = connect();
  room.disconnect(second);
  assert.strictEqual(last(first, 'leave').id, 2);
  assert.strictEqual(room.players.size, 1);
});

test('làm sạch tên và chặn linh vật lạ', () => {
  const { connect } = setup();
  const conn = connect('đm', 'dragon');
  assert.strictEqual(last(conn, 'welcome').name, 'Bạn ẩn danh');
  const other = connect('Hà');
  assert.strictEqual(last(other, 'welcome').players[0].form, 'trau');
});

test('không cho dịch chuyển tức thời và không ra khỏi vùng đi được', () => {
  const { room, connect, advance } = setup();
  const conn = connect();
  const player = room.players.get(conn);

  room.handle(conn, { t: 'move', x: 0, z: 10, ry: 0 });
  advance(100);
  room.handle(conn, { t: 'move', x: 13, z: -11, ry: 0 });
  assert.ok(Math.hypot(player.x, player.z - 10) <= 0.71);

  const before = [player.x, player.z];
  advance(60000);
  room.handle(conn, { t: 'move', x: 999, z: 999, ry: 0 });
  advance(60000);
  room.handle(conn, { t: 'move', x: 20, z: 24, ry: 0 });
  assert.deepStrictEqual([player.x, player.z], before);
});

test('ra sân phải đi qua cửa chính, không xuyên tường', () => {
  const { room, connect, advance } = setup();
  const conn = connect();
  const player = room.players.get(conn);

  room.handle(conn, { t: 'move', x: 10, z: 21, ry: 0 });
  advance(60000);
  room.handle(conn, { t: 'move', x: 10, z: 26, ry: 0 });
  assert.strictEqual(player.z, 21);

  advance(60000);
  room.handle(conn, { t: 'move', x: 0, z: 21, ry: 0 });
  advance(60000);
  room.handle(conn, { t: 'move', x: 0, z: 40, ry: 0 });
  assert.strictEqual(player.z, 40);
});

test('đi nhanh chỉ tới điểm có sẵn và làm người chơi đứng dậy', () => {
  const { room, connect } = setup();
  const conn = connect();
  const player = room.players.get(conn);

  room.handle(conn, { t: 'move', x: 0, z: 10, ry: 0, sitting: true });
  room.handle(conn, { t: 'travel', spot: 'san' });
  assert.deepStrictEqual([player.x, player.z, player.sitting], [0, 42, false]);

  room.handle(conn, { t: 'travel', spot: 'constructor' });
  room.handle(conn, { t: 'travel', spot: 'khong-co' });
  assert.deepStrictEqual([player.x, player.z], [0, 42]);
});

test('bỏ qua tọa độ không hợp lệ', () => {
  const { room, connect } = setup();
  const conn = connect();
  room.handle(conn, { t: 'move', x: 'a', z: null, ry: 0 });
  room.handle(conn, { t: 'move', x: Infinity, z: 1, ry: 0 });
  assert.strictEqual(room.players.get(conn).x, 0);
});

test('giới hạn tốc độ chat và lọc nội dung', () => {
  const { room, connect, advance } = setup();
  const conn = connect();

  room.handle(conn, { t: 'chat', text: 'cố lên cả nhà' });
  room.handle(conn, { t: 'chat', text: 'tin thứ hai' });
  assert.strictEqual(conn.sent.filter((m) => m.t === 'chat').length, 1);

  advance(2000);
  room.handle(conn, { t: 'chat', text: 'đm' });
  room.handle(conn, { t: 'chat', text: 'vào shop.com' });
  assert.strictEqual(conn.sent.filter((m) => m.t === 'chat').length, 1);
});

test('niệm do server đếm, bấm quá nhanh không được tính', () => {
  const { room, connect, advance } = setup();
  const conn = connect();
  for (let i = 0; i < 20; i += 1) room.handle(conn, { t: 'niem', count: 9999 });
  assert.strictEqual(room.totalNiem, 1);
  advance(500);
  room.handle(conn, { t: 'niem' });
  assert.strictEqual(room.totalNiem, 2);
});

test('Đồng tâm đếm số người niệm trong 10 giây rồi tự giảm', () => {
  const { room, connect, advance } = setup();
  const first = connect();
  const second = connect();

  room.handle(first, { t: 'niem' });
  room.handle(second, { t: 'niem' });
  assert.strictEqual(last(first, 'niem').dongTam, 2);

  advance(10001);
  room.tick();
  assert.strictEqual(last(first, 'dongTam').dongTam, 0);
});

test('hương và đèn dùng chung giới hạn 5 giây', () => {
  const { room, connect, advance } = setup();
  const conn = connect();

  room.handle(conn, { t: 'huong' });
  room.handle(conn, { t: 'huong' });
  room.handle(conn, { t: 'den', wish: 'cầu bình an' });
  assert.strictEqual(room.totalHuong, 1);
  assert.strictEqual(room.totalDen, 0);

  advance(5000);
  room.handle(conn, { t: 'den', wish: 'cầu bình an' });
  assert.strictEqual(last(conn, 'den').wish, 'cầu bình an');
  assert.strictEqual(room.totalDen, 1);
});

test('đèn có lời xấu bị bỏ và không tốn lượt', () => {
  const { room, connect } = setup();
  const conn = connect();
  room.handle(conn, { t: 'den', wish: 'cầu đm' });
  room.handle(conn, { t: 'den', wish: '🙏' });
  assert.strictEqual(room.totalDen, 0);
  room.handle(conn, { t: 'den', wish: 'cầu sức khỏe' });
  assert.strictEqual(room.totalDen, 1);
});

test('báo tròn chuỗi ở câu thứ 108 của cả phòng', () => {
  let time = 100000;
  const room = new GameRoom(() => time, { totalNiem: 107 });
  const conn = { sent: [], send(message) { this.sent.push(message); } };
  room.handle(conn, { t: 'profile', name: 'An' });

  room.handle(conn, { t: 'niem' });
  assert.strictEqual(last(conn, 'niem').round, true);
  time += 500;
  room.handle(conn, { t: 'niem' });
  assert.strictEqual(last(conn, 'niem').round, false);
});

test('khôi phục số liệu đã lưu và đánh dấu khi có thay đổi', () => {
  const room = new GameRoom(() => 100000, { totalNiem: 5, totalHuong: 2, totalDen: 'hỏng' });
  assert.deepStrictEqual(room.snapshot(), { totalNiem: 5, totalHuong: 2, totalDen: 0 });
  assert.strictEqual(room.changed, false);

  const conn = { sent: [], send() {} };
  room.handle(conn, { t: 'profile', name: 'An' });
  room.handle(conn, { t: 'niem' });
  assert.strictEqual(room.changed, true);
});

test('chưa gửi hồ sơ thì không làm được gì', () => {
  const { room } = setup();
  const conn = { sent: [], send() {} };
  room.handle(conn, { t: 'niem' });
  room.handle(conn, { t: 'chat', text: 'chào' });
  assert.strictEqual(room.totalNiem, 0);
});

test('phòng đầy thì từ chối', () => {
  const { room, connect } = setup();
  for (let i = 0; i < MAX_PLAYERS; i += 1) connect();
  const extra = connect();
  assert.ok(last(extra, 'full'));
  assert.strictEqual(room.players.size, MAX_PLAYERS);
});

test('gói vị trí chỉ có người vừa đổi chỗ và tọa độ đã làm tròn', () => {
  const { room, connect, advance } = setup();
  const first = connect('An');
  const second = connect('Bình');
  const firstId = room.players.get(first).id;

  room.handle(first, { t: 'move', x: 1.23456, z: 2, ry: 0.5, moving: true, sitting: false });
  room.sendPositions();
  assert.deepStrictEqual(last(second, 'state').players, [[firstId, 1.23, 2, 0.5, 1]]);

  const sentBefore = second.sent.length;
  advance(200);
  room.handle(first, { t: 'move', x: 1.23456, z: 2, ry: 0.5, moving: true, sitting: false });
  room.sendPositions();
  assert.strictEqual(second.sent.length, sentBefore);

  room.handle(first, { t: 'travel', spot: 'san' });
  room.sendPositions();
  assert.deepStrictEqual(last(second, 'state').players, [[firstId, 0, 42, 0.5, 1]]);
});

test('cờ trong gói vị trí báo đúng trạng thái ngồi', () => {
  const { room, connect } = setup();
  const conn = connect();
  room.handle(conn, { t: 'move', x: 0, z: 10, ry: 0, sitting: true });
  room.sendPositions();
  assert.strictEqual(last(conn, 'state').players[0][4], 2);
});

test('lời khấn khi thắp hương không bắt buộc và phải qua bộ lọc', () => {
  const { room, connect, advance } = setup();
  const conn = connect();

  room.handle(conn, { t: 'huong', wish: 'cầu đm' });
  assert.strictEqual(room.totalHuong, 0);

  room.handle(conn, { t: 'huong', wish: 'con cầu bình an' });
  assert.strictEqual(room.totalHuong, 1);
  assert.strictEqual(last(conn, 'huong').wish, 'con cầu bình an');

  advance(5000);
  room.handle(conn, { t: 'huong' });
  assert.strictEqual(room.totalHuong, 2);
  assert.strictEqual(last(conn, 'huong').wish, '');
});
