const SETTINGS_KEY = 'adidaphat.sound';
const MO_BEAT_SECONDS = 1.15;
const MO_PHRASE_BEATS = 24; // gõ đủ một hồi mõ thì thỉnh một tiếng chuông
const BELL_REST_SECONDS = 9;
const BELL_STRIKE_SECONDS = 1.2; // tiếng thỉnh chuông trong bản ghi nằm ở giây này
const BELL_FADE_SECONDS = 10;
const BELL_VOLUME = 0.4;

const MUSIC_PATH = '/audio/nhac-nen/';
const TEMPLE_BELL_FILE = '/audio/chuong-chua.ogg'; // nguồn ghi trong public/audio/CREDITS.md
// Âm thanh tự tạo của chùa, dùng khi chưa có bài nào hoặc người chơi chọn nó
export const SYNTH_TRACK = '';

// track null nghĩa là chưa chọn: có bài thì phát bài đầu tiên
const settings = { muted: false, music: true, track: null, volume: 0.6 };
try {
  Object.assign(settings, JSON.parse(localStorage.getItem(SETTINGS_KEY)));
} catch {
  // Không đọc được thì dùng mặc định
}

let context = null;
let master = null;
let musicGain = null;
let bowlTimer = null;
let moBeat = 0;
let templeBell = null;
let tracks = [];
let notifyMusic = () => {};
const player = new Audio();
player.preload = 'none';

function activeTrack() {
  if (tracks.some(({ file }) => file === settings.track)) return settings.track;
  return settings.track === SYNTH_TRACK ? SYNTH_TRACK : tracks[0]?.file ?? SYNTH_TRACK;
}

// Áp trạng thái vào cả hai nguồn nhạc, chỉ một nguồn được kêu tại một thời điểm
function applyMusic() {
  if (!context) return;
  const track = activeTrack();
  const useSynth = settings.music && track === SYNTH_TRACK;
  musicGain.gain.value = useSynth ? settings.volume * 1.6 : 0;

  player.volume = settings.volume;
  player.muted = settings.muted;
  if (!settings.music || track === SYNTH_TRACK) {
    player.pause();
    return;
  }
  const source = MUSIC_PATH + encodeURIComponent(track);
  if (!player.src.endsWith(source)) player.src = source;
  player.play().catch(() => {}); // bị trình duyệt chặn thì lần bấm sau sẽ phát lại
}

// Hết bài thì sang bài kế tiếp, hết danh sách thì quay lại đầu
player.addEventListener('ended', () => {
  const index = tracks.findIndex(({ file }) => file === activeTrack());
  settings.track = tracks[(index + 1) % tracks.length].file;
  player.currentTime = 0;
  saveSettings();
  applyMusic();
  notifyMusic();
});

// File hỏng hoặc đã bị xóa thì quay về âm thanh tự tạo, không để chùa im lặng
player.addEventListener('error', () => {
  if (!player.getAttribute('src')) return;
  settings.track = SYNTH_TRACK;
  player.removeAttribute('src');
  applyMusic();
  notifyMusic();
});

function saveSettings() {
  try {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
  } catch {
    // Không lưu được thì chỉ có tác dụng trong lần này
  }
}

function tone(frequency, duration, volume, { type = 'sine', output = master, delay = 0 } = {}) {
  if (!context) return;
  const start = context.currentTime + delay;
  const oscillator = context.createOscillator();
  const gain = context.createGain();
  oscillator.type = type;
  oscillator.frequency.value = frequency;
  gain.gain.setValueAtTime(volume, start);
  gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);
  oscillator.connect(gain).connect(output);
  oscillator.start(start);
  oscillator.stop(start + duration);
}

function noiseBuffer(seconds) {
  const buffer = context.createBuffer(1, context.sampleRate * seconds, context.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < data.length; i += 1) data[i] = Math.random() * 2 - 1;
  return buffer;
}

function noise(duration, volume, frequency) {
  if (!context) return;
  const source = context.createBufferSource();
  const filter = context.createBiquadFilter();
  const gain = context.createGain();
  source.buffer = noiseBuffer(duration);
  filter.type = 'bandpass';
  filter.frequency.value = frequency;
  gain.gain.setValueAtTime(volume, context.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.0001, context.currentTime + duration);
  source.connect(filter).connect(gain).connect(master);
  source.start();
}

async function loadTempleBell() {
  try {
    const response = await fetch(TEMPLE_BELL_FILE);
    templeBell = await context.decodeAudioData(await response.arrayBuffer());
  } catch {
    // Trình duyệt không đọc được file thì dùng tiếng chuông tự tạo
  }
}

function ringTempleBell() {
  if (templeBell) {
    const source = context.createBufferSource();
    const gain = context.createGain();
    const start = context.currentTime;
    const length = templeBell.duration - BELL_STRIKE_SECONDS;
    source.buffer = templeBell;
    // Bản ghi kết thúc khi còn đang ngân nên phải tự làm nhỏ dần
    gain.gain.setValueAtTime(BELL_VOLUME, start + length - BELL_FADE_SECONDS);
    gain.gain.linearRampToValueAtTime(0, start + length);
    gain.gain.setValueAtTime(BELL_VOLUME, start);
    source.connect(gain).connect(musicGain);
    source.start(start, BELL_STRIKE_SECONDS);
    return;
  }
  for (const [frequency, duration, volume] of [[147, 9, 0.16], [294, 7, 0.08], [441, 4.5, 0.035], [741, 2.5, 0.015]]) {
    tone(frequency, duration, volume, { output: musicGain });
  }
}

function templeBeat() {
  moBeat += 1;
  const phraseDone = moBeat >= MO_PHRASE_BEATS;
  if (phraseDone) {
    moBeat = 0;
    ringTempleBell();
  } else {
    tone(430, 0.13, 0.12, { type: 'triangle', output: musicGain });
    tone(690, 0.07, 0.04, { output: musicGain });
  }
  bowlTimer = setTimeout(templeBeat, (phraseDone ? BELL_REST_SECONDS : MO_BEAT_SECONDS) * 1000);
}

// Nhạc nền tự tổng hợp nên không vướng bản quyền: hồi mõ, tiếng chuông và gió nhẹ trong chánh điện
function startMusic() {
  musicGain = context.createGain();
  musicGain.gain.value = 0;
  musicGain.connect(master);

  for (const [frequency, volume, wobble] of [[110, 0.05, 0.05], [165, 0.03, 0.07], [220.6, 0.018, 0.04]]) {
    const oscillator = context.createOscillator();
    const gain = context.createGain();
    const lfo = context.createOscillator();
    const lfoDepth = context.createGain();
    oscillator.frequency.value = frequency;
    gain.gain.value = volume;
    lfo.frequency.value = wobble;
    lfoDepth.gain.value = volume * 0.6;
    lfo.connect(lfoDepth).connect(gain.gain);
    oscillator.connect(gain).connect(musicGain);
    oscillator.start();
    lfo.start();
  }

  const wind = context.createBufferSource();
  const windFilter = context.createBiquadFilter();
  const windGain = context.createGain();
  wind.buffer = noiseBuffer(6);
  wind.loop = true;
  windFilter.type = 'lowpass';
  windFilter.frequency.value = 420;
  windGain.gain.value = 0.018;
  wind.connect(windFilter).connect(windGain).connect(musicGain);
  wind.start();

  loadTempleBell();
  templeBeat();
}

// Trình duyệt chỉ cho phát tiếng sau lần bấm đầu tiên của người dùng
export function unlockAudio() {
  if (context) {
    if (context.state === 'suspended') context.resume();
    return;
  }
  context = new AudioContext();
  master = context.createGain();
  master.gain.value = settings.muted ? 0 : 1;
  master.connect(context.destination);
  startMusic();
  applyMusic();
}

export const isReady = () => context?.state === 'running';

export function playWoodblock() {
  tone(760, 0.09, 0.3, { type: 'triangle' });
  tone(1180, 0.05, 0.1);
}

export function playBead() {
  tone(1900, 0.03, 0.09, { type: 'triangle' });
  noise(0.03, 0.06, 2400);
}

export function playBell() {
  for (const [frequency, duration, volume] of [[196, 5, 0.22], [392, 3.6, 0.1], [523, 2.4, 0.06], [988, 1.2, 0.03]]) {
    tone(frequency, duration, volume);
  }
}

export function playStep() {
  noise(0.07, 0.035, 500);
}

export function playSit() {
  tone(120, 0.16, 0.16);
  noise(0.12, 0.05, 300);
}

export function playChat() {
  tone(880, 0.09, 0.05);
  tone(1175, 0.11, 0.04, { delay: 0.06 });
}

export function playIncense() {
  noise(0.9, 0.05, 900);
  tone(330, 1.4, 0.05);
}

export function playLantern() {
  [659, 880, 1109].forEach((frequency, index) => tone(frequency, 1.1, 0.05, { delay: index * 0.14 }));
}

export const isMuted = () => settings.muted;
export const isMusicOn = () => settings.music;

export function toggleMuted() {
  settings.muted = !settings.muted;
  if (master) master.gain.value = settings.muted ? 0 : 1;
  applyMusic();
  saveSettings();
  return settings.muted;
}

export const currentTrack = activeTrack;
export const musicVolume = () => settings.volume;
export const onMusicChange = (listener) => {
  notifyMusic = listener;
};

export function setTracks(list) {
  tracks = list;
  applyMusic();
}

export function turnMusicOff() {
  settings.music = false;
  applyMusic();
  saveSettings();
}

export function selectTrack(track) {
  settings.music = true;
  settings.track = track;
  applyMusic();
  saveSettings();
}

export function setMusicVolume(volume) {
  settings.volume = volume;
  applyMusic();
  saveSettings();
}
