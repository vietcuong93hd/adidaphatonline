# A Di Đà Phật Online

Dự án độc lập, gồm hai phần chạy chung một server:

- **Game chùa 3D nhiều người chơi** (`/game`): linh vật văn phòng, đi lại, ngồi bồ đoàn, chat bong bóng, niệm chung, hào quang Đồng tâm, thắp hương, thả đèn, 3 phút giải lao. Mỗi phòng tối đa 100 người, trình duyệt chỉ vẽ 30 người gần nhất. Tổng số câu, hương, đèn lưu ở `data/game-state.json` (đổi thư mục bằng `DATA_DIR`); tiến trình cá nhân lưu trên trình duyệt.
- **Màn hình TikTok Live 9:16** (`/`): ba nghi thức niệm Phật, thắp hương, thả đèn hoa đăng. Chưa nối TikTok; thử bằng trang điều khiển.

| Bình luận | Nghi thức |
| --- | --- |
| Có `nam mô`, `a di đà` | Niệm Phật |
| Có `thắp hương`, `dâng hương` | Thắp hương |
| Có `thả đèn`, hoặc mở đầu bằng `cầu`, `nguyện` | Thả đèn kèm lời nguyện |

Chạy kiểm thử bằng `npm test`.

## Cách chạy

Cần Node.js 20 trở lên.

```bash
npm.cmd install
node server.js
```

Trên Windows, PowerShell có thể chặn lệnh `npm`; dùng `npm.cmd` như trên. Giữ cửa sổ đang chạy, đóng cửa sổ là server tắt.

- Màn hình live: http://localhost:3100
- Màn hình cho OBS: http://localhost:3100/?obs=1 (Browser Source 1080 × 1920)
- Điều khiển: http://localhost:3100/admin
- Bản thử game 3D: http://localhost:3100/game

Đổi cổng bằng biến môi trường `PORT`. Server chỉ mở trên máy này vì chưa có đăng nhập; đừng đặt `HOST=0.0.0.0` trước khi thêm đăng nhập.

Bộ đếm lưu trong bộ nhớ nên về 0 khi khởi động lại server.

## Bản trên Railway

- Project `adidaphatonline`, service `web`, đăng nhập bằng `npx.cmd @railway/cli login`.
- Tên miền: https://adidaphatonline.com (dự phòng https://web-production-6316de.up.railway.app). Màn TikTok Live ở `/live`.
- Cập nhật: `npx.cmd @railway/cli up --service web`
- Số liệu lưu ở volume `/data` (biến `DATA_DIR`).
- `/admin` và API điều khiển bị đóng trên bản công khai. Đặt biến `ADMIN_PASSWORD` để mở, đăng nhập với tên `admin`.
