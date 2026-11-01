const test = require('node:test');
const assert = require('node:assert');
const { adminGuard } = require('../lib/adminGuard');

function run(options, path, authorization) {
  const result = { status: null, passed: false };
  const res = {
    set() {},
    status(code) {
      result.status = code;
      return this;
    },
    end() {}
  };
  adminGuard(options)({ path, headers: { authorization } }, res, () => {
    result.passed = true;
  });
  return result;
}

const basic = (text) => `Basic ${Buffer.from(text).toString('base64')}`;

test('chạy trên máy cá nhân thì không chặn', () => {
  assert.ok(run({ isPublic: false }, '/admin').passed);
});

test('chạy công khai mà chưa đặt mật khẩu thì đóng hẳn phần điều khiển', () => {
  for (const path of ['/admin', '/admin.html', '/api/ritual', '/api/comment', '/api/reset']) {
    assert.strictEqual(run({ isPublic: true }, path).status, 404);
  }
});

test('trang chơi và số liệu công khai không bị chặn', () => {
  for (const path of ['/', '/game', '/api/state', '/api/music']) {
    assert.ok(run({ isPublic: true }, path).passed);
  }
});

test('có mật khẩu thì phải đăng nhập đúng', () => {
  const options = { isPublic: true, password: 'mat-khau-thu' };
  assert.strictEqual(run(options, '/admin').status, 401);
  assert.strictEqual(run(options, '/admin', basic('admin:sai')).status, 401);
  assert.ok(run(options, '/admin', basic('admin:mat-khau-thu')).passed);
});
