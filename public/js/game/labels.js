import * as THREE from 'three';

const NAME_HEIGHT = 2.25;
const BUBBLE_HEIGHT = 2.85;
const BUBBLE_MS = 6000;
const BUBBLE_WIDTH = 460;
const FONT = '600 34px "Segoe UI", Arial, sans-serif';
const LINE_HEIGHT = 44;
const WORLD_PER_PIXEL = 0.0055;

function wrapLines(ctx, text) {
  const lines = [];
  let line = '';
  for (const word of text.split(' ')) {
    const next = line ? `${line} ${word}` : word;
    if (line && ctx.measureText(next).width > BUBBLE_WIDTH) {
      lines.push(line);
      line = word;
    } else {
      line = next;
    }
  }
  lines.push(line);
  return lines.slice(0, 3);
}

export function makeSprite(text, { background, color, wrap }) {
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  ctx.font = FONT;

  const lines = wrap ? wrapLines(ctx, text) : [text];
  const widest = Math.max(...lines.map((line) => ctx.measureText(line).width));
  canvas.width = Math.ceil(widest) + 48;
  canvas.height = lines.length * LINE_HEIGHT + 24;

  ctx.font = FONT;
  ctx.fillStyle = background;
  ctx.beginPath();
  ctx.roundRect(0, 0, canvas.width, canvas.height, 22);
  ctx.fill();
  ctx.fillStyle = color;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  lines.forEach((line, index) => {
    ctx.fillText(line, canvas.width / 2, 12 + LINE_HEIGHT * (index + 0.5));
  });

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: texture, depthTest: false, transparent: true }));
  sprite.scale.set(canvas.width * WORLD_PER_PIXEL, canvas.height * WORLD_PER_PIXEL, 1);
  sprite.renderOrder = 10;
  return sprite;
}

export function disposeSprite(sprite) {
  sprite.parent?.remove(sprite);
  sprite.material.map.dispose();
  sprite.material.dispose();
}

export class Nameplate {
  constructor(parent, name) {
    this.parent = parent;
    this.nameSprite = null;
    this.bubble = null;
    this.bubbleLeft = 0;
    this.setName(name);
  }

  setName(name) {
    if (this.nameSprite) disposeSprite(this.nameSprite);
    this.nameSprite = makeSprite(name, { background: 'rgba(30, 16, 8, .72)', color: '#f0c675' });
    this.nameSprite.position.y = NAME_HEIGHT;
    this.parent.add(this.nameSprite);
  }

  say(text) {
    this.clearBubble();
    this.bubble = makeSprite(text, { background: '#fff8ea', color: '#33190a', wrap: true });
    this.bubble.position.y = BUBBLE_HEIGHT;
    this.parent.add(this.bubble);
    this.bubbleLeft = BUBBLE_MS;
  }

  clearBubble() {
    if (this.bubble) disposeSprite(this.bubble);
    this.bubble = null;
  }

  update(dt) {
    if (!this.bubble) return;
    this.bubbleLeft -= dt * 1000;
    if (this.bubbleLeft <= 0) this.clearBubble();
  }

  destroy() {
    this.clearBubble();
    disposeSprite(this.nameSprite);
  }
}
