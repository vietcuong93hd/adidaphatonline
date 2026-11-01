const MAX_COUNT = { niem: 108, huong: 9, den: 1 };
const MAX_NAME_LENGTH = 40;
const MAX_WISH_LENGTH = 80;
const DEFAULT_USER = 'Một bạn';

// Giữ dấu vì bỏ dấu sẽ chặn nhầm từ thường: "lớn", "các", "ngủ"
const BLOCKED_WORDS = [
  'lồn', 'cặc', 'buồi', 'địt', 'đụ', 'đéo', 'đĩ', 'cứt', 'chó đẻ',
  'đm', 'đmm', 'dm', 'dmm', 'đcm', 'dcm', 'clm', 'vcl', 'vl', 'cc'
];
const BLOCKED_RE = new RegExp(
  `(?<![\\p{L}\\p{N}])(${BLOCKED_WORDS.join('|')})(?![\\p{L}\\p{N}])`,
  'iu'
);
const LINK_RE = /https?:|www\.|\.(com|net|org|vn)\b/i;

function cleanText(raw, maxLength) {
  return String(raw ?? '')
    .normalize('NFKC')
    .normalize('NFC')
    .replace(/[^\p{Script=Latin}\p{N}\s.,!?]/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, maxLength)
    .trim();
}

function isBlocked(text) {
  return BLOCKED_RE.test(text) || LINK_RE.test(text);
}

function stripDiacritics(text) {
  return text
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .replace(/đ/g, 'd');
}

function buildEvent({ type, user, count, wish } = {}) {
  if (!Object.hasOwn(MAX_COUNT, type)) return null;

  const name = cleanText(user, MAX_NAME_LENGTH);
  const parsed = Math.floor(Number(count)) || 1;
  const event = {
    type,
    user: name && !isBlocked(name) ? name : DEFAULT_USER,
    count: Math.min(MAX_COUNT[type], Math.max(1, parsed))
  };

  if (type === 'den') {
    const cleanWish = cleanText(wish, MAX_WISH_LENGTH);
    if (cleanWish && isBlocked(cleanWish)) return null;
    event.wish = cleanWish || 'Cầu bình an';
  }
  return event;
}

function parseComment(rawText) {
  const text = cleanText(rawText, MAX_WISH_LENGTH);
  if (!text || isBlocked(text)) return null;

  const lower = text.toLowerCase();
  const plain = stripDiacritics(lower);

  if (/\b(thap|dang) huong\b/.test(plain)) return { type: 'huong', count: 1 };
  // "nguyện" phải giữ dấu, nếu không sẽ khớp với họ Nguyễn
  if (/\btha den\b/.test(plain) || /^cau\s/.test(plain) || /^nguyện\s/.test(lower)) {
    return { type: 'den', wish: text };
  }
  if (/\b(nam mo|a di da|adida)\b/.test(plain)) return { type: 'niem', count: 1 };
  return null;
}

module.exports = { buildEvent, parseComment, cleanText, isBlocked };
