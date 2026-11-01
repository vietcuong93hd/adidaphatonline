const CARD = { width: 1080, height: 1350, photoHeight: 800 };
const SITE = 'adidaphatonline.com';
const FILE_NAME = 'chua-a-di-da.png';

function drawCover(ctx, source, width, height) {
  const scale = Math.max(width / source.width, height / source.height);
  const drawWidth = source.width * scale;
  const drawHeight = source.height * scale;
  ctx.drawImage(source, (width - drawWidth) / 2, (height - drawHeight) / 2, drawWidth, drawHeight);
}

function drawStat(ctx, x, value, label) {
  ctx.fillStyle = 'rgba(240, 198, 117, .12)';
  ctx.beginPath();
  ctx.roundRect(x - 150, 1020, 300, 150, 22);
  ctx.fill();
  ctx.fillStyle = '#f0c675';
  ctx.font = '700 60px "Times New Roman", serif';
  ctx.fillText(String(value), x, 1085);
  ctx.fillStyle = '#fff4df';
  ctx.font = '30px "Segoe UI", Arial, sans-serif';
  ctx.fillText(label, x, 1140);
}

function drawCard(photo, { name, title, place, todayCount, daysVisited }) {
  const card = document.createElement('canvas');
  card.width = CARD.width;
  card.height = CARD.height;
  const ctx = card.getContext('2d');
  const center = CARD.width / 2;

  ctx.fillStyle = '#1c0e07';
  ctx.fillRect(0, 0, CARD.width, CARD.height);
  ctx.save();
  ctx.beginPath();
  ctx.rect(0, 0, CARD.width, CARD.photoHeight);
  ctx.clip();
  drawCover(ctx, photo, CARD.width, CARD.photoHeight);
  ctx.restore();

  const fade = ctx.createLinearGradient(0, CARD.photoHeight - 280, 0, CARD.photoHeight);
  fade.addColorStop(0, 'rgba(28, 14, 7, 0)');
  fade.addColorStop(1, '#1c0e07');
  ctx.fillStyle = fade;
  ctx.fillRect(0, CARD.photoHeight - 280, CARD.width, 280);

  ctx.textAlign = 'center';
  ctx.fillStyle = '#ffffff';
  ctx.font = '700 66px "Times New Roman", serif';
  ctx.fillText('Hôm nay tôi đã lên chùa', center, 780);
  ctx.fillStyle = '#f0c675';
  ctx.font = '700 58px "Times New Roman", serif';
  ctx.fillText(name, center, 880);
  ctx.fillStyle = '#fff4df';
  ctx.font = '32px "Segoe UI", Arial, sans-serif';
  ctx.fillText(`${title} · ${place}`, center, 945);

  drawStat(ctx, 340, todayCount, 'câu niệm hôm nay');
  drawStat(ctx, 740, daysVisited, 'ngày đã ghé chùa');

  ctx.fillStyle = '#f0c675';
  ctx.beginPath();
  ctx.roundRect(center - 300, 1225, 600, 76, 38);
  ctx.fill();
  ctx.fillStyle = '#33190a';
  ctx.font = '600 32px "Segoe UI", Arial, sans-serif';
  ctx.fillText(`Cùng lên chùa tại ${SITE}`, center, 1275);
  return card;
}

export function createShare({ capture, readInfo, onMessage }) {
  const panel = document.getElementById('photo');
  const preview = document.getElementById('photo-preview');
  const shareButton = document.getElementById('photo-share');
  let blob = null;
  let previewUrl = null;

  const toFile = () => new File([blob], FILE_NAME, { type: 'image/png' });

  function save() {
    const link = document.createElement('a');
    link.href = previewUrl;
    link.download = FILE_NAME;
    link.click();
  }

  document.getElementById('photo-open').addEventListener('click', () => {
    // Phải vẽ thẻ ngay sau khi render, trước khi trình duyệt xóa khung hình
    const card = drawCard(capture(), readInfo());
    card.toBlob((result) => {
      blob = result;
      if (previewUrl) URL.revokeObjectURL(previewUrl);
      previewUrl = URL.createObjectURL(blob);
      preview.src = previewUrl;
      shareButton.hidden = !navigator.canShare?.({ files: [toFile()] });
      panel.hidden = false;
    }, 'image/png');
  });

  // Trên điện thoại, bảng chia sẻ của máy có sẵn Zalo, Facebook, Messenger nếu đã cài
  shareButton.addEventListener('click', async () => {
    try {
      await navigator.share({ files: [toFile()], text: `Hôm nay tôi đã lên chùa tại ${SITE}` });
    } catch (error) {
      if (error.name !== 'AbortError') onMessage('Chưa chia sẻ được, bạn thử tải ảnh về nhé');
    }
  });
  document.getElementById('photo-save').addEventListener('click', save);
  document.getElementById('photo-link').addEventListener('click', async () => {
    try {
      await navigator.clipboard.writeText(`${location.origin}/game`);
      onMessage('Đã sao chép link');
    } catch {
      onMessage('Trình duyệt chưa cho sao chép link');
    }
  });
  document.getElementById('photo-close').addEventListener('click', () => {
    panel.hidden = true;
  });
}
