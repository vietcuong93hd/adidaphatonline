const fs = require('fs');
const http = require('http');
const path = require('path');
const express = require('express');
const { WebSocketServer } = require('ws');
const { buildEvent, parseComment } = require('./lib/rituals');
const { GameRoom } = require('./lib/gameRoom');
const { NpcCrowd } = require('./lib/npcs');
const { listMusic } = require('./lib/music');
const { adminGuard } = require('./lib/adminGuard');

// Trên máy cá nhân chỉ mở cho chính máy này; Railway cần nghe trên mọi địa chỉ
const IS_PUBLIC = Boolean(process.env.RAILWAY_ENVIRONMENT_NAME);
const HOST = process.env.HOST || (IS_PUBLIC ? '0.0.0.0' : '127.0.0.1');
const PORT = Number(process.env.PORT) || 3100;
const GAME_TICK_MS = 100;
const POSITION_SEND_MS = 200;
const SAVE_INTERVAL_MS = 5000;
// Railway gắn ổ bền ở /data; ở máy cá nhân dùng thư mục data của project
const DATA_DIR = process.env.DATA_DIR || path.join(__dirname, 'data');
const GAME_STATE_FILE = path.join(DATA_DIR, 'game-state.json');
const MUSIC_DIR = path.join(__dirname, 'public', 'audio', 'nhac-nen');

const TOTAL_KEY = { niem: 'totalNiem', huong: 'totalHuong', den: 'totalDen' };

const state = { totalNiem: 0, totalHuong: 0, totalDen: 0, seq: 0, lastEvent: null };

const app = express();
app.use(adminGuard({ isPublic: IS_PUBLIC, password: process.env.ADMIN_PASSWORD }));
app.use(express.json({ limit: '10kb' }));
app.use(express.static(path.join(__dirname, 'public'), { index: false }));

app.use('/vendor/three', express.static(path.join(__dirname, 'node_modules', 'three', 'build')));

app.get(['/', '/game'], (_req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'game.html'));
});

app.get('/live', (_req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.get('/admin', (_req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'admin.html'));
});

app.get('/api/state', (_req, res) => {
  res.json(state);
});

app.get('/api/music', (_req, res) => {
  res.json(listMusic(MUSIC_DIR));
});

app.post('/api/ritual', (req, res) => {
  const event = buildEvent(req.body);
  if (!event) return res.status(400).json({ error: 'Nghi thức hoặc nội dung không hợp lệ', state });
  res.json(recordEvent(event));
});

// Bình luận đi qua đây giống hệt bình luận TikTok sau này
app.post('/api/comment', (req, res) => {
  const { user, text } = req.body || {};
  const ritual = parseComment(text);
  const event = ritual && buildEvent({ ...ritual, user });
  res.json(event ? recordEvent(event) : state);
});

app.post('/api/reset', (_req, res) => {
  Object.assign(state, { totalNiem: 0, totalHuong: 0, totalDen: 0, lastEvent: null });
  state.seq += 1;
  broadcast();
  res.json(state);
});

const server = http.createServer(app);
const wss = new WebSocketServer({ noServer: true });
const gameWss = new WebSocketServer({ noServer: true, maxPayload: 2048 });
const gameRoom = new GameRoom(Date.now, readGameState());
const npcCrowd = new NpcCrowd(gameRoom);

function readGameState() {
  try {
    return JSON.parse(fs.readFileSync(GAME_STATE_FILE, 'utf8'));
  } catch {
    return {}; // lần chạy đầu chưa có file
  }
}

function saveGameState() {
  if (!gameRoom.changed) return;
  gameRoom.changed = false;
  // Ghi ra file tạm rồi đổi tên để tắt máy giữa chừng không làm hỏng file cũ
  const tempFile = `${GAME_STATE_FILE}.tmp`;
  try {
    fs.mkdirSync(DATA_DIR, { recursive: true });
    fs.writeFileSync(tempFile, JSON.stringify(gameRoom.snapshot()));
    fs.renameSync(tempFile, GAME_STATE_FILE);
  } catch (err) {
    gameRoom.changed = true;
    console.error('Không lưu được số liệu game:', err.message);
  }
}

// Hai WebSocketServer dùng chung một cổng nên phải tự chia theo đường dẫn
server.on('upgrade', (req, socket, head) => {
  const { pathname } = new URL(req.url, 'http://localhost');
  const target = { '/ws': wss, '/game-ws': gameWss }[pathname];
  if (!target) {
    socket.destroy();
    return;
  }
  target.handleUpgrade(req, socket, head, (ws) => target.emit('connection', ws, req));
});

wss.on('connection', (ws) => {
  ws.send(JSON.stringify(state));
});

// Tin gửi cho cả phòng là cùng một object, nên chỉ cần đóng gói một lần
const encodedMessages = new WeakMap();

function encode(message) {
  let encoded = encodedMessages.get(message);
  if (!encoded) {
    encoded = Buffer.from(JSON.stringify(message));
    encodedMessages.set(message, encoded);
  }
  return encoded;
}

gameWss.on('connection', (ws) => {
  const conn = {
    send(message) {
      if (ws.readyState === 1) ws.send(encode(message), { binary: false });
    }
  };

  ws.on('message', (raw) => {
    try {
      gameRoom.handle(conn, JSON.parse(raw.toString('utf8')));
    } catch {
      // Bỏ qua gói tin hỏng, không để một người làm sập cả phòng
    }
  });
  ws.on('close', () => gameRoom.disconnect(conn));
  ws.on('error', () => ws.terminate());
});

setInterval(() => {
  npcCrowd.update(GAME_TICK_MS / 1000);
  gameRoom.tick();
}, GAME_TICK_MS);
setInterval(() => gameRoom.sendPositions(), POSITION_SEND_MS);
setInterval(saveGameState, SAVE_INTERVAL_MS);

for (const signal of ['SIGINT', 'SIGTERM']) {
  process.on(signal, () => {
    saveGameState();
    process.exit(0);
  });
}

function recordEvent(event) {
  state[TOTAL_KEY[event.type]] += event.count;
  state.seq += 1;
  state.lastEvent = event;
  broadcast();
  return state;
}

function broadcast() {
  const payload = JSON.stringify(state);
  for (const client of wss.clients) {
    if (client.readyState === 1) client.send(payload);
  }
}

server.listen(PORT, HOST, () => {
  console.log(`Game:          http://localhost:${PORT}`);
  console.log(`Màn hình live: http://localhost:${PORT}/live`);
  console.log(`Màn hình OBS:  http://localhost:${PORT}/live?obs=1`);
  console.log(`Điều khiển:    http://localhost:${PORT}/admin`);
});
