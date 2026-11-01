# CLAUDE.md

Adidaphatonline là project độc lập, không liên quan tới zalominiapp.com. Trao đổi và viết nội dung bằng tiếng Việt.

## Sản phẩm

Game chùa 3D nhiều người chơi trên web cho dân công sở, kèm màn hình TikTok Live 9:16 chưa nối TikTok. Người chơi hóa thân thành 12 nhân vật "Sở thú công sở" dễ thương: Trâu cày, Ngựa chiến, Ong thợ, Chim lợn, Mãng xà, Lươn chúa, Cáo già, Gà mờ, Thỏ đế, Tắc kè hoa, Cú đêm, Báo thủ. Tên, đặc điểm và câu cửa miệng trong `avatars.js` lấy nguyên từ bảng của chủ dự án. Không bán công đức, không hứa linh ứng.

## Chạy

- `node server.js`, mở http://localhost:3100/game
- `npm.cmd test` (PowerShell trên máy này chặn lệnh `npm`)

## Quy ước

- Server quyết định mọi thứ: vị trí, số câu niệm, chat. Không tin số từ trình duyệt.
- Vùng đi được ở `lib/gameRoom.js` phải khớp `public/js/game/walk.js`; điểm tham quan ở đó phải khớp `public/js/game/tour.js`.
- Hình 3D dựng bằng code, nhẹ cho điện thoại. Không lấy code hay tài nguyên của game khác.
- Đồng tu giả lập (`lib/npcs.js`) chỉ tạo không khí: không cộng vào số câu niệm thật, không chat, không thả lời nguyện giả. Ngoại lệ duy nhất là bong bóng đùa tìm dép ngoài sân, không đi qua kênh chat. Bảng bồ đoàn ở đó phải khớp `world.js`.
- Đo tốc độ bằng `/game?bench` rồi gọi `gameBench()`. Đếm khung hình khi cửa sổ không được chọn sẽ ra số sai.
- Tượng Phật trong `world.js` là bản tạm, sẽ thay khi có người duyệt hoặc mô hình tốt hơn.
