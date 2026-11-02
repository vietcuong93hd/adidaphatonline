// Hướng dẫn lần đầu: chỉ ghi nhận thao tác có thật, không tự giả lập lượt niệm.
const SEEN_KEY = 'adidaphat.welcome.v1';
const PROGRESS_KEY = 'adidaphat.journey.v1';
const STEPS = ['avatar', 'niem', 'invite'];

function readProgress() {
  try {
    const saved = JSON.parse(localStorage.getItem(PROGRESS_KEY) || '{}');
    if (!saved || typeof saved !== 'object' || Array.isArray(saved)) return {};
    return Object.fromEntries(STEPS.map((key) => [key, saved[key] === true]));
  } catch {
    return {};
  }
}

function wasSeen() {
  try { return localStorage.getItem(SEEN_KEY) === '1'; }
  catch { return false; }
}

function remember(key, value) {
  try { localStorage.setItem(key, value); }
  catch { /* Có trình duyệt chặn lưu trữ riêng tư. */ }
}

export function createJourney({ onMessage }) {
  const welcome = document.getElementById('welcome-cover');
  const panel = document.getElementById('journey-cover');
  const trigger = document.getElementById('journey-trigger');
  const progressText = document.getElementById('journey-progress');
  const finish = document.getElementById('journey-finish');
  const copyFallback = document.getElementById('journey-link');
  const progress = readProgress();
  const link = `${location.origin}/game`;

  function render() {
    const done = STEPS.filter((key) => progress[key]).length;
    progressText.textContent = `${done}/3 bước đã hoàn thành`;
    trigger.textContent = done === 3 ? '✓ Đã làm quen với chùa' : `🌿 Làm quen ${done}/3`;
    finish.hidden = done !== 3;
    for (const key of STEPS) {
      const button = document.querySelector(`[data-journey="${key}"]`);
      button?.classList.toggle('completed', Boolean(progress[key]));
      if (button) button.setAttribute('aria-label', `${button.dataset.label}: ${progress[key] ? 'đã hoàn thành' : 'chưa hoàn thành'}`);
      const tick = button?.querySelector('.journey-tick');
      if (tick) tick.textContent = progress[key] ? '✓' : '○';
    }
  }

  function complete(key) {
    if (!STEPS.includes(key) || progress[key]) return;
    progress[key] = true;
    remember(PROGRESS_KEY, JSON.stringify(progress));
    render();
    if (STEPS.every((step) => progress[step])) {
      onMessage('Bạn đã làm quen với chùa. Chúc một ngày an lành!');
    }
  }

  function closePanel() {
    panel.hidden = true;
    trigger.focus();
  }

  function openPanel() {
    panel.hidden = false;
    panel.querySelector('#journey-close').focus();
  }

  function enter(showSteps) {
    remember(SEEN_KEY, '1');
    welcome.hidden = true;
    if (showSteps) openPanel();
    else trigger.focus();
  }

  async function invite() {
    const title = 'Cùng ghé Chùa A Di Đà Online';
    const text = 'Giải lao một chút: chọn linh vật văn phòng, dạo chùa 3D và cùng niệm Phật.';
    try {
      if (navigator.share) {
        await navigator.share({ title, text, url: link });
        complete('invite');
        onMessage('Cảm ơn bạn đã chia sẻ lời mời!');
        return;
      }
      if (!navigator.clipboard?.writeText) throw new Error('Không hỗ trợ sao chép');
      await navigator.clipboard.writeText(`${text}\n${link}`);
      complete('invite');
      onMessage('Đã sao chép lời mời, bạn có thể gửi cho bạn bè.');
    } catch (error) {
      if (error?.name === 'AbortError') return; // Người dùng chủ động hủy chia sẻ
      copyFallback.hidden = false;
      copyFallback.value = link;
      copyFallback.focus();
      copyFallback.select();
      onMessage('Có thể chọn và sao chép liên kết trong ô này.');
    }
  }

  document.getElementById('welcome-go').addEventListener('click', () => enter(true));
  document.getElementById('welcome-skip').addEventListener('click', () => enter(false));
  trigger.addEventListener('click', openPanel);
  document.getElementById('journey-close').addEventListener('click', closePanel);
  panel.addEventListener('click', (event) => { if (event.target === panel) closePanel(); });
  document.addEventListener('keydown', (event) => {
    if (event.key !== 'Escape') return;
    if (!welcome.hidden) enter(false);
    else if (!panel.hidden) closePanel();
  });

  document.querySelector('[data-journey="avatar"]').addEventListener('click', () => {
    closePanel();
    document.getElementById('profile').open = true;
    document.querySelector('#forms button')?.focus();
  });
  document.getElementById('forms').addEventListener('click', (event) => {
    if (event.target.closest('button[data-form]')) complete('avatar');
  });

  document.querySelector('[data-journey="niem"]').addEventListener('click', () => {
    closePanel();
    document.getElementById('niem').click();
    onMessage('Đang gửi lời niệm. Khi máy chủ xác nhận, bước này sẽ hoàn thành.');
  });
  document.querySelector('[data-journey="invite"]').addEventListener('click', invite);

  welcome.hidden = wasSeen();
  trigger.hidden = false;
  render();
  return { complete };
}
