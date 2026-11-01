const ROUND_SIZE = 108;
const STORE_KEY = 'adidaphat.beads';
const MIN_GAP_MS = 420; // server không tính câu niệm cách nhau dưới 400 ms
const SWIPE_PIXELS = 24;
const SVG_NS = 'http://www.w3.org/2000/svg';
const RING = { x: 200, y: 200, radius: 178, beadRadius: 5.1 };
const GAP_ANGLE = 0.14; // khoảng hở dưới đáy cho hạt mẫu
const MARKER_EVERY = 27; // hạt ngọc đánh dấu mỗi phần tư chuỗi

function readStore() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORE_KEY)) || {};
    return { count: saved.count || 0, rounds: saved.rounds || 0 };
  } catch {
    return { count: 0, rounds: 0 };
  }
}

export function createBeads({ onBead, onRound, onClose }) {
  const overlay = document.getElementById('beads');
  const zone = document.getElementById('bead-zone');
  const ring = document.getElementById('bead-ring');
  const countEl = document.getElementById('bead-count');
  const roundsEl = document.getElementById('bead-rounds');

  const store = readStore();
  let lastBeadAt = 0;
  let swipeY = null;

  // Hạt đầu nằm cạnh hạt mẫu, lần ngược chiều kim đồng hồ quanh vòng
  const beads = Array.from({ length: ROUND_SIZE }, (_, i) => {
    const angle = GAP_ANGLE + (i / (ROUND_SIZE - 1)) * (Math.PI * 2 - GAP_ANGLE * 2);
    const bead = document.createElementNS(SVG_NS, 'circle');
    bead.setAttribute('cx', RING.x + Math.sin(angle) * RING.radius);
    bead.setAttribute('cy', RING.y + Math.cos(angle) * RING.radius);
    ring.append(bead);
    return bead;
  });

  function render() {
    beads.forEach((bead, i) => {
      const marker = (i + 1) % MARKER_EVERY === 0 && i + 1 < ROUND_SIZE;
      const now = i === store.count;
      bead.setAttribute('r', now ? RING.beadRadius * 1.7 : RING.beadRadius * (marker ? 1.25 : 1));
      bead.setAttribute('fill', i < store.count || now ? 'url(#bead-gold)' : marker ? 'url(#bead-jade)' : 'url(#bead-wood)');
      bead.classList.toggle('mala-now', now);
    });
    countEl.textContent = store.count;
    roundsEl.textContent = `Đã tròn ${store.rounds} chuỗi`;
  }

  function save() {
    try {
      localStorage.setItem(STORE_KEY, JSON.stringify(store));
    } catch {
      // Không lưu được thì chỉ giữ trong lần này
    }
  }

  function advance() {
    const now = Date.now();
    if (now - lastBeadAt < MIN_GAP_MS) return;
    lastBeadAt = now;

    store.count += 1;
    if (store.count >= ROUND_SIZE) {
      store.count = 0;
      store.rounds += 1;
      onRound();
    }
    save();
    render();
    onBead();
  }

  zone.addEventListener('pointerdown', (event) => {
    swipeY = event.clientY;
    zone.setPointerCapture?.(event.pointerId);
  });
  zone.addEventListener('pointermove', (event) => {
    if (swipeY !== null && event.clientY - swipeY > SWIPE_PIXELS) {
      swipeY = event.clientY;
      advance();
    }
  });
  zone.addEventListener('pointerup', (event) => {
    if (swipeY !== null && Math.abs(event.clientY - swipeY) < SWIPE_PIXELS) advance();
    swipeY = null;
  });
  zone.addEventListener('pointercancel', () => {
    swipeY = null;
  });

  addEventListener('keydown', (event) => {
    if (overlay.hidden || event.repeat) return;
    if (event.code === 'Space' || event.code === 'ArrowDown') {
      event.preventDefault();
      advance();
    }
  });

  document.getElementById('bead-back').addEventListener('click', () => {
    overlay.hidden = true;
    onClose();
  });

  render();
  return {
    open() {
      overlay.hidden = false;
    }
  };
}
