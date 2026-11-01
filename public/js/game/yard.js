import * as THREE from 'three';

const YARD_FAR_Z = 120;
// Phải khớp SHOE_PILE trong lib/npcs.js
export const SHOE_PILE = { halfWidth: 3.5, minZ: 31, maxZ: 40 };
const SHOE_COUNT = 70;
const SHOE_COLORS = ['#d9443a', '#2f7fd1', '#f0c02f', '#3aa35c', '#f28cb1', '#f4f1e8', '#34302c'];
const material = (color, options = {}) => new THREE.MeshLambertMaterial({ color, ...options });

function addMesh(parent, geometry, mat, x = 0, y = 0, z = 0) {
  const mesh = new THREE.Mesh(geometry, mat);
  mesh.position.set(x, y, z);
  parent.add(mesh);
  return mesh;
}

function addGround(parent, width, depth, mat, x, y, z) {
  const mesh = addMesh(parent, new THREE.PlaneGeometry(width, depth), mat, x, y, z);
  mesh.rotation.x = -Math.PI / 2;
  return mesh;
}

function canvasTexture(size, draw) {
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = size;
  draw(canvas.getContext('2d'), size);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
  return texture;
}

function instanced(parent, geometry, mat, transforms) {
  const mesh = new THREE.InstancedMesh(geometry, mat, transforms.length);
  const dummy = new THREE.Object3D();
  transforms.forEach(({ x = 0, y = 0, z = 0, sx = 1, sy = 1, sz = 1 }, index) => {
    dummy.position.set(x, y, z);
    dummy.scale.set(sx, sy, sz);
    dummy.updateMatrix();
    mesh.setMatrixAt(index, dummy.matrix);
  });
  mesh.frustumCulled = false;
  parent.add(mesh);
  return mesh;
}

// Hình chóp 4 mặt là mái chùa rẻ nhất; thêm nóc và đầu đao vàng cho ra dáng
const roofGeometry = new THREE.ConeGeometry(1, 1, 4);
roofGeometry.rotateY(Math.PI / 4);
const tipGeometry = new THREE.ConeGeometry(0.5, 2, 6);

function addRoof(parent, { width, depth, height, y, x = 0, z = 0, tile, gold }) {
  const roof = addMesh(parent, roofGeometry, tile, x, y + height / 2, z);
  roof.scale.set(width * 0.707, height, depth * 0.707);
  for (const sx of [-1, 1]) {
    for (const sz of [-1, 1]) {
      const tip = addMesh(parent, tipGeometry, gold, x + sx * width * 0.5, y + 0.3, z + sz * depth * 0.5);
      tip.rotation.set(sz * 0.6, 0, -sx * 0.6);
      tip.scale.setScalar(Math.max(0.7, width / 22));
    }
  }
}

function addFacade(parent, { tile, gold, wall, lacquer }) {
  const z = 24.1;
  const signTexture = (() => {
    const canvas = document.createElement('canvas');
    canvas.width = 1024;
    canvas.height = 220;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#7a1f12';
    ctx.fillRect(0, 0, 1024, 220);
    ctx.strokeStyle = '#e0ac45';
    ctx.lineWidth = 14;
    ctx.strokeRect(14, 14, 996, 192);
    ctx.fillStyle = '#f7d27e';
    ctx.font = '700 104px "Times New Roman", serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('CHÙA A DI ĐÀ', 512, 116);
    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    return texture;
  })();

  const side = new THREE.PlaneGeometry(18.5, 20);
  addMesh(parent, side, wall, -12.75, 10, z);
  addMesh(parent, side, wall, 12.75, 10, z);
  addMesh(parent, new THREE.PlaneGeometry(7, 11), wall, 0, 14.5, z);
  addMesh(parent, new THREE.BoxGeometry(0.6, 9.3, 0.6), gold, -3.8, 4.65, z + 0.2);
  addMesh(parent, new THREE.BoxGeometry(0.6, 9.3, 0.6), gold, 3.8, 4.65, z + 0.2);
  addMesh(parent, new THREE.BoxGeometry(8.2, 0.6, 0.6), gold, 0, 9.3, z + 0.2);
  addMesh(parent, new THREE.PlaneGeometry(11, 2.4), new THREE.MeshBasicMaterial({ map: signTexture }), 0, 12.4, z + 0.3);

  // Hàng cột hiên phía trước
  const pillarX = [-20, -13, -6.5, 6.5, 13, 20];
  instanced(parent, new THREE.CylinderGeometry(0.75, 0.8, 18, 16), lacquer, pillarX.map((x) => ({ x, y: 9, z: 27 })));
  addMesh(parent, new THREE.BoxGeometry(48, 1, 7), lacquer, 0, 18.3, 27);

  // Mặt ngoài tường hông và hậu cung
  const flank = new THREE.PlaneGeometry(60, 20);
  const left = addMesh(parent, flank, wall, -22.05, 10, -6);
  left.rotation.y = -Math.PI / 2;
  const right = addMesh(parent, flank, wall, 22.05, 10, -6);
  right.rotation.y = Math.PI / 2;

  addRoof(parent, { width: 60, depth: 78, height: 8, y: 19, z: -6, tile, gold });
  addRoof(parent, { width: 34, depth: 50, height: 9, y: 25, z: -6, tile, gold });
  addMesh(parent, new THREE.BoxGeometry(2.4, 0.8, 22), gold, 0, 33.8, -6);
}

function addGate(parent, { tile, gold, lacquer, stone }) {
  const z = 110;
  const openings = [{ x: -11, w: 6, h: 7 }, { x: 0, w: 8, h: 9 }, { x: 11, w: 6, h: 7 }];
  for (const { x, w, h } of openings) {
    for (const side of [-1, 1]) addMesh(parent, new THREE.BoxGeometry(1.4, h + 3, 2.4), lacquer, x + (side * (w + 1.4)) / 2, (h + 3) / 2, z);
    addMesh(parent, new THREE.BoxGeometry(w + 2.8, 3, 2.4), stone, x, h + 1.5, z);
    addRoof(parent, { width: w + 6, depth: 7, height: 3.6, y: h + 3, x, z, tile, gold });
  }
  addRoof(parent, { width: 12, depth: 6, height: 3.6, y: 15, z, tile, gold });
  addMesh(parent, new THREE.BoxGeometry(5, 3, 3), lacquer, 0, 14.4, z);
}

function addBellTower(parent, { tile, gold, lacquer, stone }) {
  const x = -33;
  const z = 66;
  addMesh(parent, new THREE.BoxGeometry(10, 1, 10), stone, x, 0.5, z);
  instanced(parent, new THREE.CylinderGeometry(0.4, 0.45, 8, 10), lacquer, [[-3.6, -3.6], [3.6, -3.6], [-3.6, 3.6], [3.6, 3.6]].map(([dx, dz]) => ({ x: x + dx, y: 5, z: z + dz })));
  addRoof(parent, { width: 14, depth: 14, height: 3.6, y: 9, x, z, tile, gold });
  addMesh(parent, new THREE.BoxGeometry(5, 3, 5), lacquer, x, 13, z);
  addRoof(parent, { width: 10, depth: 10, height: 4, y: 14.4, x, z, tile, gold });
  const profile = [[0, 3.2], [0.8, 3.2], [1, 2.6], [1.1, 1], [1.5, 0]].map(([px, py]) => new THREE.Vector2(px, py));
  addMesh(parent, new THREE.LatheGeometry(profile, 18), gold, x, 4.6, z);
}

function addPagoda(parent, { tile, gold, stone }) {
  const x = 33;
  const z = 66;
  const wall = material('#e8dcc4');
  addMesh(parent, new THREE.CylinderGeometry(7, 7.6, 1, 8), stone, x, 0.5, z);

  let y = 1;
  for (let tier = 0; tier < 7; tier += 1) {
    const radius = 4.6 - tier * 0.5;
    const height = 3.2 - tier * 0.15;
    addMesh(parent, new THREE.CylinderGeometry(radius * 0.86, radius, height, 8), wall, x, y + height / 2, z);
    y += height;
    addMesh(parent, new THREE.ConeGeometry(radius * 1.35, 1.3, 8), tile, x, y + 0.5, z);
    y += 0.9;
  }
  addMesh(parent, new THREE.ConeGeometry(0.5, 3.4, 10), gold, x, y + 1.7, z);
}

function addPond(parent, cx, cz, radius) {
  const water = addMesh(parent, new THREE.CircleGeometry(radius, 44), material('#58a9bd'), cx, 0.03, cz);
  water.rotation.x = -Math.PI / 2;
  const rim = addMesh(parent, new THREE.TorusGeometry(radius, 0.4, 8, 44), material('#a79a84'), cx, 0.1, cz);
  rim.rotation.x = Math.PI / 2;

  const pads = [];
  const flowers = [];
  for (let i = 0; i < 26; i += 1) {
    const angle = i * 2.4;
    const distance = radius * 0.18 + (i / 26) * radius * 0.72;
    const x = cx + Math.cos(angle) * distance;
    const z = cz + Math.sin(angle) * distance;
    pads.push({ x, y: 0.08, z });
    if (i % 2) flowers.push({ x, y: 0.5, z });
  }
  instanced(parent, new THREE.CylinderGeometry(0.85, 0.85, 0.05, 12), material('#3f9256'), pads);
  instanced(parent, new THREE.ConeGeometry(0.4, 0.8, 6), material('#f39bb2'), flowers);
}

// Dép để lung tung trước cửa chánh điện
function addShoes(parent) {
  const shoes = new THREE.InstancedMesh(new THREE.BoxGeometry(0.34, 0.09, 0.8), material('#ffffff'), SHOE_COUNT);
  const dummy = new THREE.Object3D();
  const color = new THREE.Color();
  for (let i = 0; i < SHOE_COUNT; i += 1) {
    dummy.position.set(
      (Math.random() - 0.5) * (SHOE_PILE.halfWidth + 3) * 2,
      0.07 + (i % 4) * 0.06,
      SHOE_PILE.minZ + Math.random() * (SHOE_PILE.maxZ - SHOE_PILE.minZ)
    );
    dummy.rotation.set((Math.random() - 0.5) * 0.3, Math.random() * Math.PI * 2, (Math.random() - 0.5) * 0.3);
    dummy.updateMatrix();
    shoes.setMatrixAt(i, dummy.matrix);
    shoes.setColorAt(i, color.set(SHOE_COLORS[i % SHOE_COLORS.length]));
  }
  shoes.frustumCulled = false;
  parent.add(shoes);
}

function addTrees(parent) {
  const spots = [];
  for (let i = 0; i < 16; i += 1) {
    const t = i / 15;
    const z = 30 + t * 76;
    spots.push({ x: -54 + (i % 2) * 4, z }, { x: 54 - (i % 2) * 4, z });
  }
  for (let i = 0; i < 9; i += 1) spots.push({ x: -40 + i * 10, z: 104 + (i % 2) * 2 });
  const usable = spots.filter(({ x }) => Math.abs(x) > 18);

  instanced(parent, new THREE.CylinderGeometry(0.5, 0.7, 5, 7), material('#6b4426'), usable.map(({ x, z }) => ({ x, y: 2.5, z })));
  instanced(parent, new THREE.IcosahedronGeometry(3.6, 1), material('#4b9a55', { flatShading: true }), usable.map(({ x, z }, i) => ({ x, y: 7, z, sy: 1 + (i % 3) * 0.15 })));
  instanced(parent, new THREE.IcosahedronGeometry(2.4, 1), material('#63b268', { flatShading: true }), usable.map(({ x, z }) => ({ x: x + 1.2, y: 9.4, z })));

  // Cội bồ đề lớn
  const bode = new THREE.Group();
  bode.position.set(-23, 0, 46);
  parent.add(bode);
  addMesh(bode, new THREE.CylinderGeometry(1.1, 1.9, 9, 10), material('#6b4426'), 0, 4.5, 0);
  const leaf = material('#3f8f4d', { flatShading: true });
  for (const [x, y, z, r] of [[0, 12, 0, 7], [-5, 10, 1, 4.6], [5, 10.5, -1, 4.8], [1, 15, 2, 4.6]]) {
    addMesh(bode, new THREE.IcosahedronGeometry(r, 1), leaf, x, y, z);
  }
}

function addScenery(parent) {
  const hills = [];
  for (let i = 0; i < 16; i += 1) {
    const angle = (i / 16) * Math.PI * 2;
    hills.push({ x: Math.cos(angle) * 190, y: 22, z: 60 + Math.sin(angle) * 190, sx: 1 + (i % 3) * 0.35, sy: 1 + (i % 4) * 0.28, sz: 1 });
  }
  instanced(parent, new THREE.ConeGeometry(50, 44, 7), material('#7fa89a', { flatShading: true }), hills);
}

export function buildYard(scene) {
  const group = new THREE.Group();
  scene.add(group);

  const palette = {
    tile: material('#8f4a2c', { flatShading: true }),
    gold: material('#e0ac45', { emissive: '#8a5a10', emissiveIntensity: 0.5 }),
    wall: material('#a83a26'),
    lacquer: material('#a3261a'),
    stone: material('#9c9180')
  };

  const grass = canvasTexture(256, (ctx, size) => {
    ctx.fillStyle = '#6fae62';
    ctx.fillRect(0, 0, size, size);
    for (let i = 0; i < 900; i += 1) {
      ctx.fillStyle = i % 2 ? '#7cba6c' : '#62a257';
      ctx.fillRect(Math.random() * size, Math.random() * size, 3, 3);
    }
  });
  grass.repeat.set(80, 80);
  addGround(group, 700, 700, material('#ffffff', { map: grass }), 0, -0.02, 60);

  const paving = canvasTexture(256, (ctx, size) => {
    ctx.fillStyle = '#c9bda6';
    ctx.fillRect(0, 0, size, size);
    ctx.strokeStyle = '#a89b84';
    ctx.lineWidth = 6;
    ctx.strokeRect(0, 0, size, size);
    ctx.strokeRect(size / 2, 0, size / 2, size / 2);
    ctx.strokeRect(0, size / 2, size / 2, size / 2);
  });
  paving.repeat.set(4, 44);
  addGround(group, 12, YARD_FAR_Z - 24, material('#ffffff', { map: paving }), 0, 0.01, (YARD_FAR_Z + 24) / 2);

  const plazaPaving = paving.clone();
  plazaPaving.repeat.set(20, 20);
  const plaza = addMesh(group, new THREE.CircleGeometry(22, 48), material('#ffffff', { map: plazaPaving }), 0, 0.02, 46);
  plaza.rotation.x = -Math.PI / 2;

  addFacade(group, palette);
  addGate(group, palette);
  addBellTower(group, palette);
  addPagoda(group, palette);
  addPond(group, -26, 88, 12);
  addPond(group, 26, 88, 12);
  addTrees(group);
  addScenery(group);
  addShoes(group);

  // Cột đèn đá hai bên đường
  const lamps = [];
  for (let z = 34; z <= 100; z += 11) lamps.push({ x: -7.5, z }, { x: 7.5, z });
  instanced(group, new THREE.BoxGeometry(0.8, 2.2, 0.8), palette.stone, lamps.map((l) => ({ ...l, y: 1.1 })));
  instanced(group, new THREE.BoxGeometry(1, 0.7, 1), new THREE.MeshBasicMaterial({ color: '#ffd28a' }), lamps.map((l) => ({ ...l, y: 2.5 })));
  instanced(group, new THREE.ConeGeometry(1.1, 0.9, 4), palette.tile, lamps.map((l) => ({ ...l, y: 3.3 })));

  return {
    group,
    obstacles: [
      { x: -33, z: 66, radius: 7.5 },
      { x: 33, z: 66, radius: 8 },
      { x: -26, z: 88, radius: 12.6 },
      { x: 26, z: 88, radius: 12.6 },
      { x: -23, z: 46, radius: 2.8 },
      ...lamps.map(({ x, z }) => ({ x, z, radius: 1 }))
    ]
  };
}
