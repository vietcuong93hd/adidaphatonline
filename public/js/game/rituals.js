import * as THREE from 'three';
import { makeSprite, disposeSprite } from './labels.js';

const URN = { x: 0, y: 3.7, z: -12.6 };
const LANTERN_SECONDS = 26;
const LANTERN_RISE = 0.62;
const MAX_LANTERNS = 14;
const SMOKE_SECONDS = 7;
const SMOKE_RATE = 1.6;
const MAX_SMOKE = 40;

function smokeTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = 64;
  const ctx = canvas.getContext('2d');
  const gradient = ctx.createRadialGradient(32, 32, 2, 32, 32, 32);
  gradient.addColorStop(0, 'rgba(255, 244, 228, .5)');
  gradient.addColorStop(1, 'rgba(255, 244, 228, 0)');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, 64, 64);
  return new THREE.CanvasTexture(canvas);
}

export function createRitualEffects(scene) {
  const lanterns = [];
  const puffs = [];
  const texture = smokeTexture();
  const lanternBody = new THREE.CylinderGeometry(0.42, 0.34, 0.7, 12);
  const lanternMat = new THREE.MeshBasicMaterial({ color: '#ffb35c' });
  let burnLeft = 0;
  let smokeDue = 0;

  function removeLantern(lantern) {
    disposeSprite(lantern.label);
    scene.remove(lantern.group);
  }

  function addPuff() {
    if (puffs.length >= MAX_SMOKE) return;
    const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: texture, transparent: true, depthWrite: false }));
    sprite.position.set(URN.x + (Math.random() - 0.5), URN.y, URN.z + (Math.random() - 0.5));
    scene.add(sprite);
    puffs.push({ sprite, age: 0, drift: (Math.random() - 0.5) * 0.4 });
  }

  return {
    lightIncense() {
      burnLeft = SMOKE_SECONDS;
    },
    releaseLantern({ name, wish, x, z }) {
      if (lanterns.length >= MAX_LANTERNS) removeLantern(lanterns.shift());

      const group = new THREE.Group();
      group.position.set(x, 2, z);
      group.add(new THREE.Mesh(lanternBody, lanternMat));
      const label = makeSprite(`${name}: ${wish}`, { background: 'rgba(30, 16, 8, .72)', color: '#ffe3b0', wrap: true });
      label.position.y = 1.1;
      group.add(label);
      scene.add(group);
      lanterns.push({ group, label, age: 0 });
    },
    update(dt) {
      for (let i = lanterns.length - 1; i >= 0; i -= 1) {
        const lantern = lanterns[i];
        lantern.age += dt;
        lantern.group.position.y += dt * LANTERN_RISE;
        lantern.group.position.x += Math.sin(lantern.age) * dt * 0.1;
        if (lantern.age > LANTERN_SECONDS) {
          removeLantern(lantern);
          lanterns.splice(i, 1);
        }
      }

      if (burnLeft > 0) {
        burnLeft -= dt;
        smokeDue += dt * SMOKE_RATE;
        while (smokeDue >= 1) {
          smokeDue -= 1;
          addPuff();
        }
      }

      for (let i = puffs.length - 1; i >= 0; i -= 1) {
        const puff = puffs[i];
        puff.age += dt;
        const life = puff.age / SMOKE_SECONDS;
        puff.sprite.position.y += dt * 1.3;
        puff.sprite.position.x += dt * puff.drift;
        puff.sprite.scale.setScalar(0.8 + life * 4);
        puff.sprite.material.opacity = 1 - life;
        if (life >= 1) {
          scene.remove(puff.sprite);
          puff.sprite.material.dispose();
          puffs.splice(i, 1);
        }
      }
    }
  };
}
