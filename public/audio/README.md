# File âm thanh

Đặt đúng tên, đúng thư mục. Định dạng MP3, 128 đến 192 kbps, cắt bỏ khoảng lặng đầu và cuối, không chèn lời giới thiệu hay nhạc quảng cáo. Chỉ dùng bản có quyền sử dụng.

## Bắt buộc: `public/audio/sutras/`

| File | Nội dung |
| --- | --- |
| `taisan.mp3` | Trọn lời Kinh Dīghajāṇu, đúng thứ tự trong `public/js/game/sutras.js` |
| `thantai.mp3` | Một câu chân ngôn Hoàng Thần Tài, 3 đến 6 giây, game tự lặp theo nhịp |
| `duocsu.mp3` | Một câu "Nam mô Dược Sư Lưu Ly Quang Vương Phật", 3 đến 6 giây, game tự lặp theo nhịp |
| `thiensinh.mp3` | Trọn lời Kinh Thiện Sinh, đúng thứ tự trong `public/js/game/sutras.js` |
| `samajivi.mp3` | Trọn lời Kinh Samajīvī, đúng thứ tự trong `public/js/game/sutras.js` |
| `tubi.mp3` | Trọn lời Kinh Từ Bi, đúng thứ tự trong `public/js/game/sutras.js` |

## Nhạc nền: `public/audio/nhac-nen/`

Thả bao nhiêu bài cũng được (`.mp3`, `.m4a`, `.ogg`, `.wav`), không cần sửa code hay khởi động lại server. Thêm, đổi hoặc xóa file là bảng Nhạc nền trong game cập nhật ở lần mở sau.

- Tên file là tên bài hiện trong game, ví dụ `Tiếng chuông chiều.mp3`. Dấu `-` và `_` được đổi thành khoảng trắng.
- Bài đứng đầu theo thứ tự chữ cái sẽ phát mặc định, hết bài tự chuyển bài kế. Muốn bài nào đầu thì đặt tên `1 Tên bài.mp3`.
- Chưa có bài nào thì game dùng âm thanh tự tạo.
- Chỉ dùng bài có quyền sử dụng, nhạc từ TikTok hay YouTube thường không được phép đưa lên web.

## Không bắt buộc: `public/audio/`

Không có thì game dùng âm thanh tự tạo.

| File | Nội dung |
| --- | --- |
| `mo.mp3` | Một tiếng mõ, dưới 1 giây |
| `chuong.mp3` | Một tiếng chuông, 3 đến 6 giây |
