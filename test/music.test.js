const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { listMusic } = require('../lib/music');

test('chỉ liệt kê file nhạc, lấy tên bài từ tên file', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'nhac-'));
  fs.writeFileSync(path.join(dir, 'tieng-chuong_chieu.mp3'), '');
  fs.writeFileSync(path.join(dir, 'An nhiên.M4A'), '');
  fs.writeFileSync(path.join(dir, 'ghi-chu.txt'), '');
  fs.mkdirSync(path.join(dir, 'thu-muc.mp3'));

  assert.deepStrictEqual(listMusic(dir), [
    { file: 'An nhiên.M4A', title: 'An nhiên' },
    { file: 'tieng-chuong_chieu.mp3', title: 'tieng chuong chieu' }
  ]);
  fs.rmSync(dir, { recursive: true });
});

test('chưa có thư mục thì trả danh sách rỗng', () => {
  assert.deepStrictEqual(listMusic(path.join(os.tmpdir(), 'khong-co-thu-muc-nay')), []);
});
