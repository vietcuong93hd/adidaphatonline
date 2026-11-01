import * as THREE from 'three';

const HALO_HEIGHT = 1.5;
const HALO_SIZE = 2.5;
const HALO_SECONDS = 12;
const FADE_SECONDS = 1.2;
const SPIN_SPEED = 0.35;
const TEXTURE_SIZE = 256;
const RAY_COUNT = 16;

function drawHalo() {
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = TEXTURE_SIZE;
  const ctx = canvas.getContext('2d');
  const center = TEXTURE_SIZE / 2;

  const glow = ctx.createRadialGradient(center, center, center * 0.3, center, center, center);
  glow.addColorStop(0, 'rgba(255, 214, 120, .55)');
  glow.addColorStop(0.6, 'rgba(255, 190, 80, .28)');
  glow.addColorStop(1, 'rgba(255, 170, 60, 0)');
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, TEXTURE_SIZE, TEXTURE_SIZE);

  ctx.strokeStyle = 'rgba(255, 226, 150, .55)';
  ctx.lineWidth = 3;
  for (let i = 0; i < RAY_COUNT; i += 1) {
    const angle = (i / RAY_COUNT) * Math.PI * 2;
    const inner = center * 0.74;
    const outer = center * (i % 2 ? 0.86 : 0.96);
    ctx.beginPath();
    ctx.moveTo(center + Math.cos(angle) * inner, center + Math.sin(angle) * inner);
    ctx.lineTo(center + Math.cos(angle) * outer, center + Math.sin(angle) * outer);
    ctx.stroke();
  }

  ctx.strokeStyle = '#ffe28f';
  ctx.lineWidth = 9;
  ctx.beginPath();
  ctx.arc(center, center, center * 0.68, 0, Math.PI * 2);
  ctx.stroke();

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

let haloTexture = null;

// Vòng hào quang sau đầu nhân vật trong lúc nén hương còn cháy, luôn quay về phía người nhìn
export function createHeadHalo(parent) {
  haloTexture ??= drawHalo();
  const material = new THREE.SpriteMaterial({
    map: haloTexture,
    transparent: true,
    opacity: 0,
    depthWrite: false,
    blending: THREE.AdditiveBlending
  });
  const sprite = new THREE.Sprite(material);
  sprite.position.y = HALO_HEIGHT;
  sprite.scale.setScalar(HALO_SIZE);
  sprite.visible = false;
  parent.add(sprite);

  let startedAt = 0;
  return {
    light() {
      startedAt = performance.now();
      sprite.visible = true;
    },
    update(dt) {
      if (!sprite.visible) return;
      // Tính theo giờ thật để chuyển tab rồi quay lại vẫn đúng thời gian
      const elapsed = (performance.now() - startedAt) / 1000;
      const left = HALO_SECONDS - elapsed;
      if (left <= 0) {
        sprite.visible = false;
        return;
      }
      const breath = 0.85 + Math.sin(elapsed * 3) * 0.15;
      material.opacity = Math.min(1, elapsed / FADE_SECONDS, left / FADE_SECONDS) * breath;
      material.rotation += dt * SPIN_SPEED;
    }
  };
}
