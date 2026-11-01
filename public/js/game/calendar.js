import { dayName, holyDay, toLunar, yearName } from './lunar.js';

const WEEKDAYS = ['Chủ nhật', 'Thứ Hai', 'Thứ Ba', 'Thứ Tư', 'Thứ Năm', 'Thứ Sáu', 'Thứ Bảy'];
const WEEK_HEADER = ['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'];
const CHECK_TODAY_MS = 60000;

const lunarDate = ({ day, month, leap }) => `${day}/${month}${leap ? ' nhuận' : ''}`;
const sameDay = (a, b) => a.toDateString() === b.toDateString();

function lunarOf(date) {
  return toLunar(date.getDate(), date.getMonth() + 1, date.getFullYear());
}

export function createCalendar() {
  const chip = document.getElementById('date-chip');
  const panel = document.getElementById('calendar');
  const title = document.getElementById('calendar-title');
  const grid = document.getElementById('calendar-grid');
  const detail = document.getElementById('calendar-detail');

  let today = new Date();
  let shown = new Date(today.getFullYear(), today.getMonth(), 1);
  let selected = today;

  function renderChip() {
    const lunar = lunarOf(today);
    const holy = holyDay(lunar);
    chip.textContent = `${today.getDate()}/${today.getMonth() + 1} · Âm ${lunarDate(lunar)}${holy ? ` · ${holy}` : ''}`;
    chip.classList.toggle('holy', Boolean(holy));
  }

  function renderDetail() {
    const lunar = lunarOf(selected);
    const holy = holyDay(lunar);
    detail.replaceChildren();
    const solar = document.createElement('strong');
    solar.textContent = `${WEEKDAYS[selected.getDay()]}, ${selected.getDate()}/${selected.getMonth() + 1}/${selected.getFullYear()}`;
    const text = document.createElement('p');
    text.textContent = `Âm lịch ${lunarDate(lunar)} năm ${yearName(lunar.year)} · Ngày ${dayName(lunar.jd)}`;
    detail.append(solar, text);
    if (holy) {
      const note = document.createElement('p');
      note.className = 'calendar-holy';
      note.textContent = holy;
      detail.append(note);
    }
  }

  function dayButton(date) {
    const lunar = lunarOf(date);
    const button = document.createElement('button');
    const solar = document.createElement('span');
    const lunarText = document.createElement('small');
    solar.textContent = date.getDate();
    lunarText.textContent = lunar.day === 1 ? `1/${lunar.month}` : lunar.day;
    button.append(solar, lunarText);
    button.classList.toggle('today', sameDay(date, today));
    button.classList.toggle('selected', sameDay(date, selected));
    button.classList.toggle('holy', Boolean(holyDay(lunar)));
    button.addEventListener('click', () => {
      selected = date;
      renderMonth();
    });
    return button;
  }

  function renderMonth() {
    const year = shown.getFullYear();
    const month = shown.getMonth();
    title.textContent = `Tháng ${month + 1}/${year}`;
    const blanks = (new Date(year, month, 1).getDay() + 6) % 7; // tuần bắt đầu từ thứ Hai
    const days = new Date(year, month + 1, 0).getDate();
    grid.replaceChildren(
      ...WEEK_HEADER.map((label) => {
        const head = document.createElement('b');
        head.textContent = label;
        return head;
      }),
      ...Array.from({ length: blanks }, () => document.createElement('i')),
      ...Array.from({ length: days }, (_, index) => dayButton(new Date(year, month, index + 1)))
    );
    renderDetail();
  }

  function moveMonth(step) {
    shown = new Date(shown.getFullYear(), shown.getMonth() + step, 1);
    renderMonth();
  }

  chip.addEventListener('click', () => {
    selected = today;
    shown = new Date(today.getFullYear(), today.getMonth(), 1);
    renderMonth();
    panel.hidden = false;
  });
  document.getElementById('calendar-prev').addEventListener('click', () => moveMonth(-1));
  document.getElementById('calendar-next').addEventListener('click', () => moveMonth(1));
  document.getElementById('calendar-close').addEventListener('click', () => {
    panel.hidden = true;
  });

  // Để game mở qua đêm thì nhãn vẫn đúng ngày
  setInterval(() => {
    const now = new Date();
    if (sameDay(now, today)) return;
    today = now;
    renderChip();
  }, CHECK_TODAY_MS);

  renderChip();
}
