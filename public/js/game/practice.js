const PROGRESS_KEY = 'adidaphat.progress';
const BREAK_SECONDS = 180;
const AUTO_NIEM_SECONDS = 3;
const DAILY_GOAL = 108;

const WISHES = [
  { label: 'Deadline dí', line: 'Việc nhiều đến đâu cũng làm từng việc một. Bạn đã đi được một đoạn rồi.' },
  { label: 'Họp căng', line: 'Lời nói qua rồi thì để nó qua. Giữ lại phần bạn cần, buông phần còn lại.' },
  { label: 'Mệt quá', line: 'Mệt là lúc thân nhắc bạn dừng. Vài hơi thở chậm cũng là nghỉ ngơi thật sự.' },
  { label: 'Cầu bình an', line: 'Mong bạn và người thân có một ngày nhẹ nhàng, an ổn.' }
];

const today = () => new Date().toLocaleDateString('sv');

function readProgress() {
  try {
    const saved = JSON.parse(localStorage.getItem(PROGRESS_KEY)) || {};
    return { day: saved.day || '', todayCount: saved.todayCount || 0, daysVisited: saved.daysVisited || 0 };
  } catch {
    return { day: '', todayCount: 0, daysVisited: 0 };
  }
}

export function createPractice({ onNiem, onSit }) {
  const progressEl = document.getElementById('progress');
  const panel = document.getElementById('break');
  const pickStep = document.getElementById('break-pick');
  const runStep = document.getElementById('break-run');
  const doneStep = document.getElementById('break-done');
  const wishesEl = document.getElementById('break-wishes');
  const timeEl = document.getElementById('break-time');
  const breathEl = document.getElementById('break-breath');
  const lineEl = document.getElementById('break-line');
  const countEl = document.getElementById('break-count');

  const progress = readProgress();
  const todayCount = () => (progress.day === today() ? progress.todayCount : 0);
  let running = false;
  let secondsLeft = 0;
  let endsAt = 0;
  let timer = null;
  let autoDue = 0;
  let sessionCount = 0;
  let chosen = WISHES[0];

  function save() {
    try {
      localStorage.setItem(PROGRESS_KEY, JSON.stringify(progress));
    } catch {
      // Không lưu được thì tiến trình chỉ còn trong lần này
    }
  }

  function renderProgress() {
    const count = todayCount();
    progressEl.textContent = `Hôm nay ${count}/${DAILY_GOAL} câu · Đã ghé ${progress.daysVisited} ngày`;
    progressEl.style.setProperty('--done', `${Math.min(100, (count / DAILY_GOAL) * 100)}%`);
  }

  function show(step) {
    panel.hidden = step === null;
    pickStep.hidden = step !== pickStep;
    runStep.hidden = step !== runStep;
    doneStep.hidden = step !== doneStep;
  }

  function renderTime() {
    const whole = Math.ceil(secondsLeft);
    timeEl.textContent = `${Math.floor(whole / 60)}:${String(whole % 60).padStart(2, '0')}`;
  }

  function start(wish) {
    chosen = wish;
    running = true;
    secondsLeft = BREAK_SECONDS;
    endsAt = Date.now() + BREAK_SECONDS * 1000;
    autoDue = 0;
    sessionCount = 0;
    onSit();
    renderTime();
    show(runStep);
    // Dùng giờ thật thay vì khung hình, vì người dùng hay chuyển tab về việc đang làm
    timer = setInterval(tick, 1000);
    tick();
  }

  function tick() {
    secondsLeft = Math.max(0, (endsAt - Date.now()) / 1000);
    breathEl.textContent = Math.floor(secondsLeft / 5) % 2 ? 'Hít vào' : 'Thở ra';
    autoDue -= 1;
    if (autoDue <= 0) {
      autoDue = AUTO_NIEM_SECONDS;
      onNiem();
    }
    renderTime();
    if (secondsLeft <= 0) finish();
  }

  function finish() {
    running = false;
    clearInterval(timer);
    lineEl.textContent = chosen.line;
    countEl.textContent = `Bạn vừa niệm ${sessionCount} câu cùng mọi người.`;
    show(doneStep);
  }

  for (const wish of WISHES) {
    const button = document.createElement('button');
    button.textContent = wish.label;
    button.addEventListener('click', () => start(wish));
    wishesEl.append(button);
  }

  document.getElementById('break-open').addEventListener('click', () => show(pickStep));
  document.getElementById('break-cancel').addEventListener('click', () => show(null));
  document.getElementById('break-stop').addEventListener('click', finish);
  document.getElementById('break-close').addEventListener('click', () => show(null));

  // Chỉ tính ngày ghé khi đã niệm thật, tránh đếm lần mở nhầm
  function recordOwnNiem() {
    const day = today();
    if (progress.day !== day) {
      progress.day = day;
      progress.todayCount = 0;
      progress.daysVisited += 1;
    }
    progress.todayCount += 1;
    if (running) sessionCount += 1;
    save();
    renderProgress();
  }

  renderProgress();
  return {
    recordOwnNiem,
    stats: () => ({
      todayCount: todayCount(),
      daysVisited: progress.daysVisited
    })
  };
}
