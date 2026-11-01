import * as THREE from 'three';
import { buildTemple } from './world.js';
import { buildYard, SHOE_PILE } from './yard.js';
import { createTour } from './tour.js';
import { HALL_FRONT_Z, isWalkable } from './walk.js';
import { AVATARS, addBlobShadow } from './avatars.js';
import { Nameplate } from './labels.js';
import { connectGame } from './net.js';
import { createOtherPlayers, pulseScale } from './players.js';
import { createRitualEffects } from './rituals.js';
import { createPractice } from './practice.js';
import { createBeads } from './beads.js';
import { createChant } from './chant.js';
import { createShare } from './share.js';
import {
  isMuted,
  isMusicOn,
  playBead,
  playBell,
  playChat,
  playIncense,
  playLantern,
  playSit,
  playStep,
  playWoodblock,
  toggleMuted,
  unlockAudio
} from './audio.js';
import { createMusicPanel } from './musicPanel.js';
import { createCalendar } from './calendar.js';
import { createHeadHalo } from './headHalo.js';

const WALK_SPEED = 5;
const PLAYER_RADIUS = 0.6;
const SIT_DISTANCE = 1.5;
const CUSHION_TOP = 0.24;
const CAMERA_INSIDE = { x: 21.2, minZ: -15, maxZ: 23.2 };
const CAMERA_OUTSIDE = { x: 70, minZ: 24.8, maxZ: 118 };
const INSIDE_LOOK = { fog: '#2c160a', near: 34, far: 92, light: 2.3 };
const OUTSIDE_LOOK = { fog: '#cfe3ee', near: 90, far: 330, light: 2.9 };
const JOYSTICK_RANGE = 44;
const FORM_KEY = 'adidaphat.form';
const DEFAULT_FORM = 'trau';
const NAME_KEY = 'adidaphat.name';
const MOVE_SEND_SECONDS = 0.2;
const PULSE_SECONDS = 0.35;
const FULL_GLOW_PEOPLE = 5; // số người niệm cùng lúc để hào quang sáng tối đa
// Máy yếu thì tự giảm độ nét để giữ độ mượt
const RESOLUTION_STEPS = [1.25, 1, 0.8, 0.6];
const MIN_FPS = 28;
const FPS_SAMPLE_MS = 2000;
const STEP_SECONDS = 0.34;
const CHAT_LOG_LINES = 40;
const HINT_MS = 10000;
const SHOE_RESULTS = [
  'Thấy rồi! À không, của bác kia.',
  'Được một chiếc. Chiếc kia tùy duyên.',
  'Đôi này đẹp hơn đôi của mình…',
  'Không thấy. Thôi đi chân đất cho gần đất.',
  'Tìm được đôi của sếp, để yên chỗ cũ.',
  'Dép đây rồi! Mà sao to thế này?'
];

const canvas = document.getElementById('scene');
const sitButton = document.getElementById('sit');
const shoeButton = document.getElementById('shoe');
const hint = document.getElementById('hint');
const joystick = document.getElementById('joystick');
const knob = document.getElementById('knob');
const formsEl = document.getElementById('forms');
const formTitle = document.getElementById('form-title');
const formBlurb = document.getElementById('form-blurb');
const formQuote = document.getElementById('form-quote');
const nameInput = document.getElementById('name');
const statusEl = document.getElementById('status');
const niemButton = document.getElementById('niem');
const chatForm = document.getElementById('chat');
const chatInput = document.getElementById('chat-text');
const chatLog = document.getElementById('chat-log');
const compactChat = matchMedia('(pointer: coarse), (max-width: 699px)');
const toastEl = document.getElementById('toast');
const soundButton = document.getElementById('sound');
const wishForm = document.getElementById('wish-form');
const wishInput = document.getElementById('wish-text');

let renderer;
try {
  renderer = new THREE.WebGLRenderer({ canvas, antialias: false, powerPreference: 'high-performance' });
} catch {
  document.getElementById('error').hidden = false;
  throw new Error('WebGL không khả dụng');
}
renderer.setPixelRatio(Math.min(devicePixelRatio, RESOLUTION_STEPS[0]));
renderer.shadowMap.enabled = true;
// Đại điện đứng yên nên chỉ tính bóng một lần
renderer.shadowMap.autoUpdate = false;
renderer.shadowMap.needsUpdate = true;
renderer.toneMapping = THREE.ACESFilmicToneMapping;

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(55, 1, 0.1, 420);
const { hemi, obstacles, cushions, halo, haloRays, animate } = buildTemple(scene);
const yard = buildYard(scene);
obstacles.push(...yard.obstacles);
const tour = createTour(scene, {
  onTravel(spot) {
    stand();
    player.position.set(spot.x, 0, spot.z);
    net?.send({ t: 'travel', spot: spot.id });
    playStep();
  }
});
const others = createOtherPlayers(scene);
const effects = createRitualEffects(scene);
const sendNiem = () => net?.send({ t: 'niem' });
function sitIfNear() {
  if (nearCushion) sittingOn = nearCushion;
}
const practice = createPractice({ onNiem: sendNiem, onSit: sitIfNear });

function openFocus(panel) {
  sitIfNear();
  document.body.classList.add('focus-mode');
  panel.open();
}
const closeFocus = () => document.body.classList.remove('focus-mode');

const beads = createBeads({
  onBead() {
    playBead();
    sendNiem();
  },
  onRound() {
    playBell();
    showToast('Bạn vừa tròn một chuỗi 108 hạt');
  },
  onClose: closeFocus
});
const chant = createChant({
  onBeat: playWoodblock,
  onLine: sendNiem,
  onFinish(sutra) {
    playBell();
    showToast(`Bạn vừa tụng xong ${sutra.title}`);
  },
  onClose: closeFocus
});

createShare({
  capture() {
    updateCamera();
    renderer.render(scene, camera);
    return canvas;
  },
  readInfo: () => ({
    name: nameInput.value,
    title: AVATARS[currentForm].title,
    place: tour.placeName(),
    ...practice.stats()
  }),
  onMessage: showToast
});

const marker = new THREE.Mesh(
  new THREE.RingGeometry(0.95, 1.1, 40),
  new THREE.MeshBasicMaterial({ color: '#f0c675', side: THREE.DoubleSide })
);
marker.rotation.x = -Math.PI / 2;
marker.position.y = 0.09;
marker.visible = false;
scene.add(marker);

const player = new THREE.Group();
// Lệch ngẫu nhiên để người mới vào không đứng chồng lên nhau
player.position.set((Math.random() - 0.5) * 7, 0, 15 + Math.random() * 3);
player.rotation.y = Math.PI;
addBlobShadow(player);
scene.add(player);

const view = { yaw: 0, pitch: 0.2, distance: 7 };
const keys = new Set();
const stick = { x: 0, y: 0 };
let avatar = null;
let sittingOn = null;
let nearCushion = null;
let currentForm = DEFAULT_FORM;
let isMoving = false;
let net = null;
let selfId = null;
let totalNiem = 0;
let totalHuong = 0;
let totalDen = 0;
let toastTimer = null;
let dongTam = 0;
let glow = 0;
let pulse = 0;
let moveTimer = 0;
let stepTimer = 0;
let lastMove = '';

const plate = new Nameplate(player, readName());
const selfHalo = createHeadHalo(player);

function readName() {
  try {
    const saved = localStorage.getItem(NAME_KEY);
    if (saved) return saved;
  } catch {
    // Không đọc được thì dùng tên ngẫu nhiên
  }
  return `Bạn ${1000 + Math.floor(Math.random() * 9000)}`;
}

function sendProfile() {
  net?.send({ t: 'profile', name: nameInput.value, form: currentForm });
}

function renderStatus() {
  const together = dongTam > 0 ? ` · Đồng tâm ${dongTam}` : '';
  statusEl.textContent = `${others.count() + 1} trong chùa · ${totalNiem.toLocaleString('vi-VN')} câu · ${totalHuong} hương · ${totalDen} đèn${together}`;
}

function showToast(text) {
  toastEl.textContent = text;
  toastEl.hidden = false;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => {
    toastEl.hidden = true;
  }, 4000);
}

function addChatLine(name, text) {
  const line = document.createElement('p');
  const sender = document.createElement('strong');
  sender.textContent = `${name}: `;
  line.append(sender, text);
  chatLog.querySelector('.chat-empty')?.remove();
  chatLog.append(line);
  while (chatLog.childElementCount > CHAT_LOG_LINES) chatLog.firstElementChild.remove();
  chatLog.scrollTop = chatLog.scrollHeight;
}

function handleMessage(message) {
  if (message.t === 'welcome') {
    selfId = message.id;
    others.clear();
    message.players.forEach(others.add);
    nameInput.value = message.name;
    plate.setName(message.name);
    totalNiem = message.totalNiem;
    totalHuong = message.totalHuong;
    totalDen = message.totalDen;
    dongTam = message.dongTam;
    lastMove = '';
  } else if (message.t === 'join') {
    others.add(message.player);
  } else if (message.t === 'leave') {
    others.remove(message.id);
  } else if (message.t === 'state') {
    others.applyState(message.players, selfId);
  } else if (message.t === 'profile') {
    if (message.id === selfId) {
      nameInput.value = message.name;
      plate.setName(message.name);
    } else {
      others.setProfile(message);
    }
  } else if (message.t === 'chat') {
    if (message.id === selfId) plate.say(message.text);
    else others.say(message.id, message.text);
    addChatLine(message.name, message.text);
    playChat();
  } else if (message.t === 'niem') {
    totalNiem = message.totalNiem;
    dongTam = message.dongTam;
    if (message.id === selfId) {
      pulse = PULSE_SECONDS;
      // Tràng hạt và tụng kinh đã có tiếng riêng lúc bấm
      if (!document.body.classList.contains('focus-mode')) playWoodblock();
      practice.recordOwnNiem();
    } else {
      others.pulse(message.id);
    }
    if (message.round) {
      playBell();
      showToast(`Cả chùa vừa tròn một chuỗi 108 câu`);
    }
  } else if (message.t === 'pulse') {
    others.pulse(message.id);
  } else if (message.t === 'bubble') {
    others.say(message.id, message.text);
  } else if (message.t === 'huong') {
    totalHuong = message.totalHuong;
    effects.lightIncense();
    playIncense();
    showToast(`${message.name} vừa thắp một nén hương`);
    if (message.id === selfId) selfHalo.light();
    else others.lightHalo(message.id);
    if (message.wish) {
      if (message.id === selfId) plate.say(message.wish);
      else others.say(message.id, message.wish);
      addChatLine(message.name, `khấn: ${message.wish}`);
    }
  } else if (message.t === 'den') {
    totalDen = message.totalDen;
    effects.releaseLantern(message);
    playLantern();
  } else if (message.t === 'dongTam') {
    dongTam = message.dongTam;
  } else if (message.t === 'full') {
    statusEl.textContent = 'Chùa đang đầy, bạn thử lại sau nhé';
    return;
  }
  renderStatus();
}

function sendMove(dt) {
  moveTimer += dt;
  if (moveTimer < MOVE_SEND_SECONDS) return;
  moveTimer = 0;

  const { x, z } = player.position;
  const move = {
    t: 'move',
    x: Number(x.toFixed(2)),
    z: Number(z.toFixed(2)),
    ry: Number(player.rotation.y.toFixed(2)),
    moving: isMoving,
    sitting: Boolean(sittingOn)
  };
  const key = JSON.stringify(move);
  if (key !== lastMove) {
    lastMove = key;
    net?.send(move);
  }
}

function updateGlow(dt) {
  const target = Math.min(1, dongTam / FULL_GLOW_PEOPLE);
  glow += (target - glow) * Math.min(1, dt * 2);
  halo.material.opacity = 0.55 + glow * 0.45;
  haloRays.material.opacity = 0.25 + glow * 0.65;
}

function readForm() {
  try {
    const saved = localStorage.getItem(FORM_KEY);
    return Object.hasOwn(AVATARS, saved ?? '') ? saved : DEFAULT_FORM;
  } catch {
    return DEFAULT_FORM;
  }
}

function setForm(form) {
  if (avatar) player.remove(avatar.group);
  currentForm = form;
  sendProfile();
  avatar = AVATARS[form].create();
  player.add(avatar.group);
  formsEl.querySelectorAll('button').forEach((button) => {
    button.classList.toggle('active', button.dataset.form === form);
  });
  formTitle.textContent = AVATARS[form].title;
  formBlurb.textContent = AVATARS[form].blurb;
  formQuote.textContent = `“${AVATARS[form].quote}”`;
  try {
    localStorage.setItem(FORM_KEY, form);
  } catch {
    // Không lưu được thì lần sau dùng dạng mặc định
  }
}

function readMoveInput() {
  const x = stick.x + Number(keys.has('KeyD') || keys.has('ArrowRight')) - Number(keys.has('KeyA') || keys.has('ArrowLeft'));
  const y = stick.y + Number(keys.has('KeyW') || keys.has('ArrowUp')) - Number(keys.has('KeyS') || keys.has('ArrowDown'));
  const length = Math.hypot(x, y);
  return length > 1 ? { x: x / length, y: y / length } : { x, y };
}

function pushOutOfObstacles(position) {
  for (const { x, z, radius } of obstacles) {
    const dx = position.x - x;
    const dz = position.z - z;
    const distance = Math.hypot(dx, dz);
    const minimum = radius + PLAYER_RADIUS;
    if (distance > 0 && distance < minimum) {
      const pushedX = x + (dx / distance) * minimum;
      const pushedZ = z + (dz / distance) * minimum;
      if (isWalkable(pushedX, pushedZ)) position.set(pushedX, position.y, pushedZ);
    }
  }
}

// Chạm tường thì trượt dọc tường thay vì đứng khựng
function walk(position, dx, dz) {
  if (isWalkable(position.x + dx, position.z + dz)) {
    position.x += dx;
    position.z += dz;
  } else if (isWalkable(position.x + dx, position.z)) {
    position.x += dx;
  } else if (isWalkable(position.x, position.z + dz)) {
    position.z += dz;
  }
}

let insideLook = true;
function updateZone() {
  const inside = player.position.z < HALL_FRONT_Z;
  if (inside === insideLook) return;
  insideLook = inside;
  const look = inside ? INSIDE_LOOK : OUTSIDE_LOOK;
  scene.fog.color.set(look.fog);
  scene.fog.near = look.near;
  scene.fog.far = look.far;
  hemi.intensity = look.light;
}

function turnToward(angle, dt) {
  const delta = Math.atan2(Math.sin(angle - player.rotation.y), Math.cos(angle - player.rotation.y));
  player.rotation.y += delta * Math.min(1, dt * 12);
}

function stand() {
  sittingOn = null;
}

function updatePlayer(dt) {
  const input = readMoveInput();
  const moving = Math.hypot(input.x, input.y) > 0.05;
  isMoving = moving;
  if (moving && sittingOn) stand();

  if (moving) {
    const sin = Math.sin(view.yaw);
    const cos = Math.cos(view.yaw);
    const dx = input.x * cos - input.y * sin;
    const dz = -input.x * sin - input.y * cos;
    walk(player.position, dx * WALK_SPEED * dt, dz * WALK_SPEED * dt);
    pushOutOfObstacles(player.position);
    turnToward(Math.atan2(dx, dz), dt);
    stepTimer -= dt;
    if (stepTimer <= 0) {
      stepTimer = STEP_SECONDS;
      playStep();
    }
  }

  if (sittingOn) {
    player.position.lerp(new THREE.Vector3(sittingOn.x, CUSHION_TOP, sittingOn.z), Math.min(1, dt * 8));
    turnToward(Math.PI, dt);
  } else {
    player.position.y += (0 - player.position.y) * Math.min(1, dt * 10);
  }

  avatar.update(dt, { moving, sitting: Boolean(sittingOn) });
  pulse = Math.max(0, pulse - dt);
  avatar.group.scale.setScalar(pulseScale(pulse));
  plate.update(dt);
  selfHalo.update(dt);
}

function updateCushionPrompt() {
  nearCushion = null;
  let best = SIT_DISTANCE;
  for (const cushion of cushions) {
    const distance = Math.hypot(player.position.x - cushion.x, player.position.z - cushion.z);
    if (distance < best) {
      best = distance;
      nearCushion = cushion;
    }
  }

  const target = sittingOn || nearCushion;
  marker.visible = Boolean(nearCushion) && !sittingOn;
  if (nearCushion) marker.position.set(nearCushion.x, 0.26, nearCushion.z);
  sitButton.hidden = !target;
  sitButton.textContent = sittingOn ? 'Đứng dậy' : 'Ngồi xuống';
  const { x, z } = player.position;
  shoeButton.hidden = !(Math.abs(x) <= SHOE_PILE.halfWidth + 3 && z >= SHOE_PILE.minZ - 3 && z <= SHOE_PILE.maxZ + 3);
}

function updateCamera() {
  const horizontal = Math.cos(view.pitch) * view.distance;
  const limit = player.position.z < HALL_FRONT_Z ? CAMERA_INSIDE : CAMERA_OUTSIDE;
  camera.position.set(
    THREE.MathUtils.clamp(player.position.x + Math.sin(view.yaw) * horizontal, -limit.x, limit.x),
    Math.min(18, player.position.y + 1.2 + Math.sin(view.pitch) * view.distance),
    THREE.MathUtils.clamp(player.position.z + Math.cos(view.yaw) * horizontal, limit.minZ, limit.maxZ)
  );
  camera.lookAt(player.position.x, player.position.y + 1.9, player.position.z);
}

function resize() {
  const { clientWidth, clientHeight } = document.documentElement;
  renderer.setSize(clientWidth, clientHeight, false);
  camera.aspect = clientWidth / clientHeight;
  // Màn dọc lùi camera xa hơn để không bị chật khung
  camera.fov = camera.aspect < 1 ? 68 : 55;
  camera.updateProjectionMatrix();
}

addEventListener('keydown', (event) => {
  if (event.target instanceof HTMLInputElement) return; // đang gõ chat thì không đi
  keys.add(event.code);
  hint.hidden = true;
});
addEventListener('focusin', () => keys.clear());
addEventListener('keyup', (event) => keys.delete(event.code));
addEventListener('blur', () => keys.clear());

let dragPointer = null;
let dragX = 0;
let dragY = 0;
canvas.addEventListener('pointerdown', (event) => {
  if (dragPointer !== null) return;
  dragPointer = event.pointerId;
  dragX = event.clientX;
  dragY = event.clientY;
  canvas.setPointerCapture(event.pointerId);
});
canvas.addEventListener('pointermove', (event) => {
  if (event.pointerId !== dragPointer) return;
  view.yaw -= (event.clientX - dragX) * 0.006;
  view.pitch = THREE.MathUtils.clamp(view.pitch + (event.clientY - dragY) * 0.004, 0.12, 1.15);
  dragX = event.clientX;
  dragY = event.clientY;
});
const endDrag = (event) => {
  if (event.pointerId === dragPointer) dragPointer = null;
};
canvas.addEventListener('pointerup', endDrag);
canvas.addEventListener('pointercancel', endDrag);
canvas.addEventListener('wheel', (event) => {
  event.preventDefault();
  view.distance = THREE.MathUtils.clamp(view.distance + event.deltaY * 0.01, 3.5, 11);
}, { passive: false });

let joystickPointer = null;
function moveStick(event) {
  const rect = joystick.getBoundingClientRect();
  const dx = event.clientX - (rect.left + rect.width / 2);
  const dy = event.clientY - (rect.top + rect.height / 2);
  const scale = Math.min(1, JOYSTICK_RANGE / (Math.hypot(dx, dy) || 1));
  stick.x = (dx * scale) / JOYSTICK_RANGE;
  stick.y = (-dy * scale) / JOYSTICK_RANGE;
  knob.style.transform = `translate(${dx * scale}px, ${dy * scale}px)`;
}
function releaseStick(event) {
  if (event.pointerId !== joystickPointer) return;
  joystickPointer = null;
  stick.x = 0;
  stick.y = 0;
  knob.style.transform = '';
}
joystick.addEventListener('pointerdown', (event) => {
  joystickPointer = event.pointerId;
  joystick.setPointerCapture(event.pointerId);
  moveStick(event);
});
joystick.addEventListener('pointermove', (event) => {
  if (event.pointerId === joystickPointer) moveStick(event);
});
joystick.addEventListener('pointerup', releaseStick);
joystick.addEventListener('pointercancel', releaseStick);

shoeButton.addEventListener('click', () => {
  playWoodblock();
  plate.say(SHOE_RESULTS[Math.floor(Math.random() * SHOE_RESULTS.length)]);
});

sitButton.addEventListener('click', () => {
  if (sittingOn) {
    stand();
  } else if (nearCushion) {
    sittingOn = nearCushion;
    playSit();
  }
});

document.getElementById('beads-open').addEventListener('click', () => openFocus(beads));
document.getElementById('chant-open').addEventListener('click', () => openFocus(chant));

// Trình duyệt chặn âm thanh đến khi người dùng bấm lần đầu
addEventListener('pointerdown', unlockAudio);
addEventListener('keydown', unlockAudio);

for (const [form, { label }] of Object.entries(AVATARS)) {
  const button = document.createElement('button');
  button.dataset.form = form;
  button.textContent = label;
  button.addEventListener('click', () => setForm(form));
  formsEl.append(button);
}

niemButton.addEventListener('click', () => {
  niemButton.classList.remove('hit');
  void niemButton.offsetWidth; // reset để hiệu ứng chạy lại
  niemButton.classList.add('hit');
  net?.send({ t: 'niem' });
});

// Server chỉ nhận hương hoặc đèn cách nhau 5 giây, báo trước để bấm không bị im lặng
const RITUAL_GAP_MS = 5000;
let lastRitualAt = 0;
function ritualReady() {
  if (Date.now() - lastRitualAt >= RITUAL_GAP_MS) return true;
  showToast('Thong thả, chờ vài giây rồi dâng tiếp nhé');
  return false;
}

const RITUAL_FORMS = {
  huong: { label: 'Lời khấn của bạn (cả chùa sẽ thấy, có thể để trống)', placeholder: 'Con cầu mong…', submit: 'Thắp hương' },
  den: { label: 'Lời nguyện trên đèn (cả chùa sẽ thấy)', placeholder: 'Mong cả nhà bình an', submit: 'Thả đèn' }
};
let ritualType = 'den';

function openRitualForm(type) {
  if (!ritualReady()) return;
  const form = RITUAL_FORMS[type];
  ritualType = type;
  document.getElementById('wish-label').textContent = form.label;
  document.getElementById('wish-submit').textContent = form.submit;
  wishInput.placeholder = form.placeholder;
  wishForm.hidden = false;
  wishInput.focus();
}

document.getElementById('huong').addEventListener('click', () => openRitualForm('huong'));
document.getElementById('den').addEventListener('click', () => openRitualForm('den'));
document.getElementById('wish-cancel').addEventListener('click', () => {
  wishForm.hidden = true;
});
wishForm.addEventListener('submit', (event) => {
  event.preventDefault();
  lastRitualAt = Date.now();
  const wish = wishInput.value.trim();
  net?.send({ t: ritualType, wish: ritualType === 'den' ? wish || RITUAL_FORMS.den.placeholder : wish });
  wishInput.value = '';
  wishForm.hidden = true;
});

const musicButton = document.getElementById('music');
function renderSound() {
  soundButton.classList.toggle('off', isMuted());
  soundButton.title = isMuted() ? 'Bật tiếng' : 'Tắt tiếng';
  musicButton.classList.toggle('off', !isMusicOn());
  musicButton.title = 'Chọn nhạc nền';
}
soundButton.addEventListener('click', () => {
  toggleMuted();
  renderSound();
});
createMusicPanel({ onChange: renderSound });
createCalendar();
setTimeout(() => {
  hint.hidden = true;
}, HINT_MS);
renderSound();

chatForm.addEventListener('submit', (event) => {
  event.preventDefault();
  const text = chatInput.value.trim();
  if (!text) return;
  net?.send({ t: 'chat', text });
  chatInput.value = '';
  chatInput.blur();
  chatForm.hidden = compactChat.matches;
});
document.getElementById('chat-open').addEventListener('click', () => {
  if (compactChat.matches) chatForm.hidden = !chatForm.hidden;
  if (!chatForm.hidden) chatInput.focus();
});
// Màn nhỏ chỉ mở ô nhập khi cần, màn lớn luôn có sẵn dưới bảng chat
const syncChatForm = () => {
  chatForm.hidden = compactChat.matches;
};
compactChat.addEventListener('change', syncChatForm);
syncChatForm();

nameInput.addEventListener('change', () => {
  try {
    localStorage.setItem(NAME_KEY, nameInput.value);
  } catch {
    // Không lưu được thì lần sau dùng tên ngẫu nhiên
  }
  sendProfile();
});

new ResizeObserver(resize).observe(document.documentElement);
resize();
nameInput.value = readName();
setForm(readForm());

net = connectGame({
  onOpen: sendProfile,
  onMessage: handleMessage,
  onClose() {
    selfId = null;
    others.clear();
    statusEl.textContent = 'Đang nối lại…';
  }
});

let resolutionStep = 0;
let sampleStart = performance.now();
let sampleFrames = 0;

function adaptResolution(now) {
  sampleFrames += 1;
  const elapsed = now - sampleStart;
  if (elapsed < FPS_SAMPLE_MS) return;

  const fps = (sampleFrames * 1000) / elapsed;
  // Cửa sổ không được chọn thì trình duyệt tự giảm tốc, số đo không phản ánh sức máy
  const reliable = document.hasFocus() && elapsed < FPS_SAMPLE_MS * 2;
  if (reliable && fps < MIN_FPS && resolutionStep < RESOLUTION_STEPS.length - 1) {
    resolutionStep += 1;
    renderer.setPixelRatio(Math.min(devicePixelRatio, RESOLUTION_STEPS[resolutionStep]));
    resize();
  }
  sampleStart = now;
  sampleFrames = 0;
}

// Đo thời gian vẽ thật, kể cả khi cửa sổ không được chọn: mở /game?bench rồi gọi gameBench()
if (location.search.includes('bench')) {
  window.gameBench = (frames = 30) => {
    const gl = renderer.getContext();
    const pixel = new Uint8Array(4);
    const start = performance.now();
    for (let i = 0; i < frames; i += 1) {
      renderer.render(scene, camera);
      gl.readPixels(0, 0, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, pixel);
    }
    return {
      msPerFrame: (performance.now() - start) / frames,
      size: [canvas.width, canvas.height],
      calls: renderer.info.render.calls,
      triangles: renderer.info.render.triangles
    };
  };
}

let lastFrame = performance.now();
renderer.setAnimationLoop((now) => {
  const dt = Math.min((now - lastFrame) / 1000, 0.05);
  lastFrame = now;
  adaptResolution(now);
  updatePlayer(dt);
  updateCushionPrompt();
  updateZone();
  tour.update(player.position);
  others.update(dt, player.position);
  animate(dt);
  effects.update(dt);
  updateGlow(dt);
  sendMove(dt);
  updateCamera();
  renderer.render(scene, camera);
});
