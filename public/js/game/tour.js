import * as THREE from 'three';
import { makeSprite } from './labels.js';

const NEAR_DISTANCE = 7;
const CARD_MS = 7000;

// Tọa độ phải khớp TOUR_SPOTS trong lib/gameRoom.js
export const TOUR_SPOTS = [
  { id: 'chanhdien', name: 'Chánh điện', x: 0, z: 18, text: 'Gian chính của chùa, nơi thờ Phật và cũng là nơi đại chúng cùng tụng niệm.' },
  { id: 'san', name: 'Sân chùa', x: 0, z: 42, text: 'Lễ Phật xong, thử thách lớn nhất của ngày bắt đầu: tìm lại đôi dép của mình.' }
];

export function createTour(scene, { onTravel }) {
  const card = document.getElementById('spot-card');
  const cardName = document.getElementById('spot-name');
  const cardText = document.getElementById('spot-text');
  const map = document.getElementById('map');
  const list = document.getElementById('map-list');
  const ringMat = new THREE.MeshBasicMaterial({ color: '#ffe08a', transparent: true, opacity: 0.8, side: THREE.DoubleSide });
  const ringGeometry = new THREE.RingGeometry(1.5, 1.8, 40);
  const labels = new Map();
  let current = null;
  let cardTimer = null;

  for (const spot of TOUR_SPOTS) {
    const ring = new THREE.Mesh(ringGeometry, ringMat);
    ring.rotation.x = -Math.PI / 2;
    ring.position.set(spot.x, 0.06, spot.z);
    scene.add(ring);

    const label = makeSprite(spot.name, { background: 'rgba(30, 16, 8, .72)', color: '#f0c675' });
    label.position.set(spot.x, 3.6, spot.z);
    label.scale.multiplyScalar(1.5);
    scene.add(label);
    labels.set(spot, label);

    const button = document.createElement('button');
    button.textContent = spot.name;
    button.addEventListener('click', () => {
      map.hidden = true;
      onTravel(spot);
    });
    list.append(button);
  }

  document.getElementById('map-open').addEventListener('click', () => {
    map.hidden = false;
  });
  document.getElementById('map-close').addEventListener('click', () => {
    map.hidden = true;
  });

  return {
    placeName: () => current?.name || 'Chùa A Di Đà',
    update(position) {
      const near = TOUR_SPOTS.find((spot) => Math.hypot(position.x - spot.x, position.z - spot.z) < NEAR_DISTANCE) || null;
      if (near === current) return;
      // Đứng tại điểm nào thì thẻ thông tin thay cho biển tên ở điểm đó
      if (current) labels.get(current).visible = true;
      if (near) labels.get(near).visible = false;
      current = near;
      card.hidden = !near;
      clearTimeout(cardTimer);
      if (near) {
        cardName.textContent = near.name;
        cardText.textContent = near.text;
        // Đọc xong thì tự ẩn để không che cảnh
        cardTimer = setTimeout(() => {
          card.hidden = true;
        }, CARD_MS);
      }
    }
  };
}
