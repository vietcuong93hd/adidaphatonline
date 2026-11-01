const crypto = require('crypto');

const ADMIN_PATHS = new Set(['/admin', '/admin.html', '/api/ritual', '/api/comment', '/api/reset']);
const USER = 'admin';

function matches(given, expected) {
  const a = crypto.createHash('sha256').update(given).digest();
  const b = crypto.createHash('sha256').update(expected).digest();
  return crypto.timingSafeEqual(a, b);
}

// Khi chạy công khai, phần điều khiển mặc định đóng hẳn; đặt ADMIN_PASSWORD mới mở bằng mật khẩu
function adminGuard({ isPublic, password }) {
  return (req, res, next) => {
    if (!ADMIN_PATHS.has(req.path) || !isPublic) return next();
    if (!password) return res.status(404).end();

    const [scheme, encoded] = (req.headers.authorization || '').split(' ');
    const given = scheme === 'Basic' ? Buffer.from(encoded || '', 'base64').toString('utf8') : '';
    if (matches(given, `${USER}:${password}`)) return next();

    res.set('WWW-Authenticate', 'Basic realm="Adidaphat admin", charset="UTF-8"');
    return res.status(401).end();
  };
}

module.exports = { adminGuard };
