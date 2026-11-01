const fs = require('fs');
const path = require('path');

const AUDIO_FILE = /\.(mp3|m4a|ogg|wav)$/i;

// Đọc lại mỗi lần gọi để thả thêm bài vào thư mục là có ngay, không cần khởi động lại server
function listMusic(dir) {
  let entries;
  try {
    entries = fs.readdirSync(dir, { withFileTypes: true });
  } catch {
    return []; // chưa có thư mục thì dùng âm thanh tự tạo
  }
  return entries
    .filter((entry) => entry.isFile() && AUDIO_FILE.test(entry.name))
    .map(({ name }) => ({
      file: name,
      title: path.parse(name).name.replace(/[-_]+/g, ' ').trim()
    }))
    .sort((a, b) => a.title.localeCompare(b.title, 'vi'));
}

module.exports = { listMusic };
