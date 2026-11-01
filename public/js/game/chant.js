import { SUTRAS } from './sutras.js';

const VOICE_KEY = 'adidaphat.voice';
const VISIBLE_RADIUS = 2; // số dòng hiện trước và sau dòng đang tụng

// Nhịp càng cao càng nhanh: 1 chậm nhất, 5 nhanh nhất
const beatSeconds = (tempo) => 3.4 - tempo * 0.55;

function findVietnameseVoice() {
  if (!('speechSynthesis' in window)) return null;
  return speechSynthesis.getVoices().find((voice) => voice.lang.toLowerCase().startsWith('vi')) || null;
}

export function createChant({ onLine, onFinish, onBeat, onClose }) {
  const overlay = document.getElementById('chant');
  const tabs = document.getElementById('chant-tabs');
  const noteEl = document.getElementById('chant-note');
  const linesEl = document.getElementById('chant-lines');
  const progressEl = document.getElementById('chant-progress');
  const fish = document.getElementById('chant-fish');
  const autoInput = document.getElementById('chant-auto');
  const tempoInput = document.getElementById('chant-tempo');
  const voiceInput = document.getElementById('chant-voice');
  const voiceNote = document.getElementById('chant-voice-note');

  let sutra = SUTRAS[0];
  let index = -1;
  let autoTimer = null;

  function renderLines() {
    const start = Math.max(0, index - VISIBLE_RADIUS);
    const end = Math.min(sutra.lines.length, Math.max(index, 0) + VISIBLE_RADIUS + 1);
    linesEl.replaceChildren(...sutra.lines.slice(start, end).map((line, offset) => {
      const row = document.createElement('p');
      row.textContent = line;
      if (start + offset === index) row.className = 'current';
      return row;
    }));
    progressEl.textContent = `${Math.max(index + 1, 0)} / ${sutra.lines.length}`;
  }

  function stopVoice() {
    if ('speechSynthesis' in window) speechSynthesis.cancel();
  }

  function speak(text, onDone) {
    const voice = findVietnameseVoice();
    if (!voiceInput.checked || !voice) {
      onDone?.();
      return;
    }
    stopVoice();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.voice = voice;
    utterance.lang = voice.lang;
    utterance.rate = 0.75;
    utterance.onend = () => onDone?.();
    utterance.onerror = () => onDone?.();
    speechSynthesis.speak(utterance);
  }

  function step(onSpoken) {
    index += 1;
    if (index >= sutra.lines.length) {
      index = -1;
      setAuto(false);
      renderLines();
      onFinish(sutra);
      return;
    }
    onBeat();
    fish.classList.remove('hit');
    void fish.offsetWidth; // reset để hiệu ứng chạy lại
    fish.classList.add('hit');
    renderLines();
    if (sutra.counted) onLine();
    speak(sutra.lines[index], onSpoken);
  }

  function scheduleAuto() {
    clearTimeout(autoTimer);
    autoTimer = setTimeout(() => {
      if (autoInput.checked && !overlay.hidden) step(scheduleAuto);
    }, beatSeconds(Number(tempoInput.value)) * 1000);
  }

  function setAuto(on) {
    autoInput.checked = on;
    clearTimeout(autoTimer);
    if (on) scheduleAuto();
    else stopVoice();
  }

  function selectSutra(next) {
    setAuto(false);
    sutra = next;
    index = -1;
    noteEl.textContent = sutra.note;
    tabs.querySelectorAll('button').forEach((button) => {
      button.classList.toggle('active', button.dataset.sutra === sutra.id);
    });
    renderLines();
  }

  function renderVoiceOption() {
    const available = Boolean(findVietnameseVoice());
    voiceInput.disabled = !available;
    if (!available) voiceInput.checked = false;
    voiceNote.hidden = available;
  }

  for (const item of SUTRAS) {
    const button = document.createElement('button');
    button.dataset.sutra = item.id;
    button.textContent = item.title;
    button.addEventListener('click', () => selectSutra(item));
    tabs.append(button);
  }

  try {
    voiceInput.checked = localStorage.getItem(VOICE_KEY) === '1';
  } catch {
    // Không đọc được thì để tắt
  }
  voiceInput.addEventListener('change', () => {
    if (!voiceInput.checked) stopVoice();
    try {
      localStorage.setItem(VOICE_KEY, voiceInput.checked ? '1' : '0');
    } catch {
      // Không lưu được thì chỉ có tác dụng trong lần này
    }
  });

  fish.addEventListener('click', () => step());
  autoInput.addEventListener('change', () => setAuto(autoInput.checked));
  tempoInput.addEventListener('input', () => {
    if (autoInput.checked) scheduleAuto();
  });
  addEventListener('keydown', (event) => {
    if (overlay.hidden || event.repeat || event.code !== 'Space') return;
    event.preventDefault();
    step();
  });

  document.getElementById('chant-back').addEventListener('click', () => {
    setAuto(false);
    overlay.hidden = true;
    onClose();
  });

  if ('speechSynthesis' in window) speechSynthesis.addEventListener('voiceschanged', renderVoiceOption);
  renderVoiceOption();
  selectSutra(SUTRAS[0]);

  return {
    open() {
      renderVoiceOption();
      overlay.hidden = false;
    }
  };
}
