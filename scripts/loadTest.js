// Thử tải phòng game: node scripts/loadTest.js [số người] [số giây] [địa chỉ ws]
const { WebSocket } = require('ws');

const BOTS = Number(process.argv[2]) || 100;
const SECONDS = Number(process.argv[3]) || 60;
const URL = process.argv[4] || 'ws://127.0.0.1:3100/game-ws';
const MOVE_MS = 200;
const PING_MS = 1000;
const MOVING_SHARE = 0.3;
const NIEM_CHANCE = 0.02;
const SPEED = 5;

let received = 0;
const latencies = [];

function startBot(index) {
  const ws = new WebSocket(URL);
  const moving = index < BOTS * MOVING_SHARE;
  let x = -30 + (index % 60);
  let z = 50 + (index % 40);
  let direction = 1;
  let pingAt = 0;

  ws.on('open', () => {
    ws.send(JSON.stringify({ t: 'profile', name: `Bot ${index}`, form: 'trau' }));
    ws.send(JSON.stringify({ t: 'travel', spot: 'san' }));
    ws.send(JSON.stringify({ t: 'move', x, z, ry: 0, moving: false, sitting: false }));
  });
  ws.on('message', (data) => {
    received += data.length;
  });
  ws.on('pong', () => latencies.push(performance.now() - pingAt));
  ws.on('error', (err) => console.error('Lỗi kết nối:', err.message));

  const moveTimer = setInterval(() => {
    if (ws.readyState !== 1) return;
    if (moving) {
      z += direction * SPEED * (MOVE_MS / 1000);
      if (z > 100 || z < 35) direction = -direction;
      ws.send(JSON.stringify({ t: 'move', x, z, ry: direction > 0 ? 0 : Math.PI, moving: true, sitting: false }));
    }
    if (Math.random() < NIEM_CHANCE) ws.send(JSON.stringify({ t: 'niem' }));
  }, MOVE_MS);
  const pingTimer = setInterval(() => {
    if (ws.readyState !== 1) return;
    pingAt = performance.now();
    ws.ping();
  }, PING_MS);

  return () => {
    clearInterval(moveTimer);
    clearInterval(pingTimer);
    ws.close();
  };
}

const stops = Array.from({ length: BOTS }, (_, index) => startBot(index));

setTimeout(() => {
  received = 0;
  latencies.length = 0;
}, 5000);

setTimeout(() => {
  stops.forEach((stop) => stop());
  const sorted = latencies.sort((a, b) => a - b);
  const at = (share) => (sorted[Math.floor(sorted.length * share)] ?? 0).toFixed(1);
  const measured = SECONDS - 5;
  console.log(`${BOTS} người, đo ${measured} giây`);
  console.log(`Server gửi ra: ${(received / measured / 1024).toFixed(0)} KB/giây`);
  console.log(`Độ trễ ping: trung vị ${at(0.5)} ms, p99 ${at(0.99)} ms (${sorted.length} mẫu)`);
  process.exit(0);
}, SECONDS * 1000);
