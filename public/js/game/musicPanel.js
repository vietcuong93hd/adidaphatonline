import {
  SYNTH_TRACK,
  currentTrack,
  isMusicOn,
  musicVolume,
  onMusicChange,
  selectTrack,
  setMusicVolume,
  setTracks,
  turnMusicOff,
  unlockAudio
} from './audio.js';

async function fetchTracks() {
  try {
    const response = await fetch('/api/music');
    return response.ok ? await response.json() : [];
  } catch {
    return []; // lỗi mạng thì vẫn còn âm thanh tự tạo
  }
}

export function createMusicPanel({ onChange }) {
  const panel = document.getElementById('music-panel');
  const list = document.getElementById('music-list');
  const volume = document.getElementById('music-volume');
  let tracks = [];

  function addOption(label, active, onPick) {
    const button = document.createElement('button');
    button.textContent = label;
    button.classList.toggle('active', active);
    button.addEventListener('click', () => {
      unlockAudio();
      onPick();
      render();
    });
    return button;
  }

  function render() {
    const on = isMusicOn();
    list.replaceChildren(
      ...tracks.map(({ file, title }) => addOption(title, on && currentTrack() === file, () => selectTrack(file))),
      addOption('Âm thanh chùa', on && currentTrack() === SYNTH_TRACK, () => selectTrack(SYNTH_TRACK)),
      addOption('Tắt nhạc nền', !on, turnMusicOff)
    );
    onChange();
  }

  async function refresh() {
    tracks = await fetchTracks();
    setTracks(tracks);
    render();
  }

  document.getElementById('music').addEventListener('click', () => {
    panel.hidden = !panel.hidden;
    if (!panel.hidden) refresh();
  });
  document.getElementById('music-close').addEventListener('click', () => {
    panel.hidden = true;
  });
  volume.value = musicVolume();
  volume.addEventListener('input', () => setMusicVolume(Number(volume.value)));
  onMusicChange(render);
  refresh();
}
