const MAX_STICKS = 9;
const STICK_BURN_MS = 90000;
const MAX_LANTERNS = 6;
const LANTERN_LANES = [40, 390, 740];

const stage = document.getElementById('stage');
const altar = document.querySelector('.altar');
const sticksEl = document.getElementById('sticks');
const lanternsEl = document.getElementById('lanterns');
const lastEl = document.getElementById('last');

let lastSeq = null;
let nextLane = 0;

if (new URLSearchParams(location.search).has('obs')) {
  document.body.classList.add('obs');
}

function fitStage() {
  const { clientWidth, clientHeight } = document.documentElement;
  stage.style.setProperty('--scale', Math.min(clientWidth / 1080, clientHeight / 1920));
}

function setCount(id, value) {
  document.getElementById(id).textContent = value.toLocaleString('vi-VN');
}

function describe(event) {
  if (event.type === 'huong') return `${event.user} vừa thắp ${event.count} nén hương`;
  if (event.type === 'den') return `${event.user} vừa thả đèn hoa đăng`;
  return `${event.user} vừa niệm ${event.count} câu`;
}

function pulseAltar() {
  altar.classList.remove('pulse');
  void altar.getBoundingClientRect(); // reset để hiệu ứng chạy lại
  altar.classList.add('pulse');
}

function lightSticks(count) {
  for (let i = 0; i < count; i += 1) {
    if (sticksEl.children.length >= MAX_STICKS) sticksEl.firstElementChild.remove();
    const stick = document.createElement('div');
    stick.className = 'stick';
    sticksEl.append(stick);
    setTimeout(() => stick.remove(), STICK_BURN_MS);
  }
}

function releaseLantern(event) {
  if (lanternsEl.children.length >= MAX_LANTERNS) lanternsEl.firstElementChild.remove();

  const lantern = document.createElement('div');
  const name = document.createElement('strong');
  lantern.className = 'lantern';
  lantern.style.left = `${LANTERN_LANES[nextLane]}px`;
  nextLane = (nextLane + 1) % LANTERN_LANES.length;
  name.textContent = event.user;
  lantern.append(name, event.wish);
  lantern.addEventListener('animationend', () => lantern.remove());
  lanternsEl.append(lantern);
}

function playEvent(event) {
  lastEl.textContent = describe(event);
  if (event.type === 'huong') lightSticks(event.count);
  else if (event.type === 'den') releaseLantern(event);
  else pulseAltar();
}

function render(state) {
  setCount('total-niem', state.totalNiem);
  setCount('total-huong', state.totalHuong);
  setCount('total-den', state.totalDen);

  // Lần nhận đầu hoặc sau khi nối lại chỉ cập nhật số, không phát lại hiệu ứng
  if (lastSeq !== null && state.seq > lastSeq) {
    if (state.lastEvent) playEvent(state.lastEvent);
    else lastEl.textContent = '';
  }
  lastSeq = state.seq;
}

function connect() {
  const scheme = location.protocol === 'https:' ? 'wss' : 'ws';
  const ws = new WebSocket(`${scheme}://${location.host}/ws`);
  ws.onmessage = (event) => render(JSON.parse(event.data));
  // OBS chạy nhiều giờ nên phải tự nối lại khi server khởi động lại
  ws.onclose = () => {
    lastSeq = null;
    setTimeout(connect, 2000);
  };
}

// ResizeObserver chạy cả lần đầu và khi OBS đổi cỡ khung
new ResizeObserver(fitStage).observe(document.documentElement);
connect();
