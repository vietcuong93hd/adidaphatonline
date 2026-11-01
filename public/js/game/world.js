import * as THREE from 'three';

const STAIRS_FRONT_Z = -15.3;
const DOOR = { halfWidth: 3.5, height: 9 };
const HALL = { halfWidth: 22, back: -36, front: 24, height: 20 };
const DAIS_Y = 1.5;
const STEP_COUNT = 5;
const PILLAR_Z = [-28, -20, -12, -4, 4, 12, 20];
const PILLAR_ROWS = [{ x: 8.5, radius: 0.95 }, { x: 15, radius: 0.75 }];
const CUSHION_X = [-6.8, -4.8, -2.8, 2.8, 4.8, 6.8];
const CUSHION_Z = [-10, -7, -4, -1, 2, 5, 8, 11];

const GOLD = '#e0ac45';
const LACQUER = '#a3261a';

// Lambert nhẹ hơn nhiều so với Standard; cảnh chiếm cả màn hình nên đây là chỗ tốn nhất
function material(color, { map, emissive, emissiveIntensity } = {}) {
  return new THREE.MeshLambertMaterial({ color, ...(map && { map }), ...(emissive && { emissive, emissiveIntensity }) });
}
const goldMaterial = () => material(GOLD, { emissive: '#8a5a10', emissiveIntensity: 0.7 });

function addMesh(parent, geometry, mat, x = 0, y = 0, z = 0) {
  const mesh = new THREE.Mesh(geometry, mat);
  mesh.position.set(x, y, z);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  parent.add(mesh);
  return mesh;
}

function addPlane(parent, width, height, mat, x, y, z, rotationY = 0) {
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(width, height), mat);
  mesh.position.set(x, y, z);
  mesh.rotation.y = rotationY;
  parent.add(mesh);
  return mesh;
}

function canvasTexture(width, height, draw) {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  draw(canvas.getContext('2d'), width, height);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 4;
  return texture;
}

function drawLotusMark(ctx, x, y, size, color) {
  ctx.fillStyle = color;
  for (let i = 0; i < 8; i += 1) {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate((i / 8) * Math.PI * 2);
    ctx.beginPath();
    ctx.ellipse(0, -size * 0.6, size * 0.2, size * 0.5, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
}

function instanced(scene, geometry, mat, transforms, { shadow = false } = {}) {
  const mesh = new THREE.InstancedMesh(geometry, mat, transforms.length);
  const dummy = new THREE.Object3D();
  transforms.forEach(({ x = 0, y = 0, z = 0, sx = 1, sy = 1, sz = 1, ry = 0 }, index) => {
    dummy.position.set(x, y, z);
    dummy.scale.set(sx, sy, sz);
    dummy.rotation.set(0, ry, 0);
    dummy.updateMatrix();
    mesh.setMatrixAt(index, dummy.matrix);
  });
  mesh.castShadow = shadow;
  mesh.receiveShadow = true;
  scene.add(mesh);
  return mesh;
}

function buildShell(scene) {
  const width = HALL.halfWidth * 2;
  const depth = HALL.front - HALL.back;
  const centerZ = (HALL.front + HALL.back) / 2;

  const tiles = canvasTexture(512, 512, (ctx, w, h) => {
    ctx.fillStyle = '#6e3a1e';
    ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = '#7f4624';
    ctx.fillRect(0, 0, w / 2, h / 2);
    ctx.fillRect(w / 2, h / 2, w / 2, h / 2);
    ctx.strokeStyle = 'rgba(224, 172, 69, .55)';
    ctx.lineWidth = 5;
    ctx.strokeRect(0, 0, w, h);
    ctx.strokeRect(0, 0, w / 2, h / 2);
    drawLotusMark(ctx, w / 2, h / 2, 70, 'rgba(224, 172, 69, .5)');
  });
  tiles.wrapS = tiles.wrapT = THREE.RepeatWrapping;
  tiles.repeat.set(width / 6, depth / 6);
  const floor = addPlane(scene, width, depth, material('#ffffff', { map: tiles, roughness: 0.3 }), 0, 0, centerZ);
  floor.rotation.x = -Math.PI / 2;
  floor.castShadow = false;

  const coffer = canvasTexture(512, 512, (ctx, w, h) => {
    ctx.fillStyle = '#6b1d12';
    ctx.fillRect(0, 0, w, h);
    ctx.strokeStyle = GOLD;
    ctx.lineWidth = 16;
    ctx.strokeRect(14, 14, w - 28, h - 28);
    ctx.fillStyle = '#1f5c55';
    ctx.beginPath();
    ctx.arc(w / 2, h / 2, 170, 0, Math.PI * 2);
    ctx.fill();
    drawLotusMark(ctx, w / 2, h / 2, 150, GOLD);
  });
  coffer.wrapS = coffer.wrapT = THREE.RepeatWrapping;
  coffer.repeat.set(width / 5, depth / 5);
  const ceiling = addPlane(scene, width, depth, new THREE.MeshBasicMaterial({ map: coffer, color: '#b89a80' }), 0, HALL.height, centerZ);
  ceiling.rotation.x = Math.PI / 2;

  const wallPattern = canvasTexture(512, 512, (ctx, w, h) => {
    ctx.fillStyle = '#7a2415';
    ctx.fillRect(0, 0, w, h);
    ctx.strokeStyle = 'rgba(224, 172, 69, .6)';
    ctx.lineWidth = 8;
    ctx.strokeRect(24, 24, w - 48, h - 48);
    drawLotusMark(ctx, w / 2, h / 2, 130, 'rgba(224, 172, 69, .55)');
  });
  wallPattern.wrapS = wallPattern.wrapT = THREE.RepeatWrapping;
  const sideTexture = wallPattern.clone();
  sideTexture.repeat.set(depth / 8, HALL.height / 8);
  const endTexture = wallPattern.clone();
  endTexture.repeat.set(width / 8, HALL.height / 8);

  const sideMat = material('#ffffff', { map: sideTexture });
  const endMat = material('#ffffff', { map: endTexture });
  addPlane(scene, depth, HALL.height, sideMat, -HALL.halfWidth, HALL.height / 2, centerZ, Math.PI / 2);
  addPlane(scene, depth, HALL.height, sideMat, HALL.halfWidth, HALL.height / 2, centerZ, -Math.PI / 2);
  addPlane(scene, width, HALL.height, endMat, 0, HALL.height / 2, HALL.back);

  // Tường trước để trống cửa chính ra sân
  const sideWidth = HALL.halfWidth - DOOR.halfWidth;
  for (const side of [-1, 1]) {
    addPlane(scene, sideWidth, HALL.height, endMat, side * (DOOR.halfWidth + sideWidth / 2), HALL.height / 2, HALL.front, Math.PI);
  }
  addPlane(scene, DOOR.halfWidth * 2, HALL.height - DOOR.height, endMat, 0, (HALL.height + DOOR.height) / 2, HALL.front, Math.PI);

  // Xà ngang nối các hàng cột
  const beamMat = material('#7d2015');
  instanced(scene, new THREE.BoxGeometry(width, 0.9, 0.9), beamMat, PILLAR_Z.map((z) => ({ y: HALL.height - 0.45, z })));
  instanced(scene, new THREE.BoxGeometry(width, 0.14, 1), goldMaterial(), PILLAR_Z.map((z) => ({ y: HALL.height - 0.95, z })));
  instanced(scene, new THREE.BoxGeometry(0.9, 0.9, depth), beamMat, PILLAR_ROWS.flatMap(({ x }) => [
    { x, y: HALL.height - 0.45, z: centerZ },
    { x: -x, y: HALL.height - 0.45, z: centerZ }
  ]));
}

function buildWindows(scene) {
  const lattice = canvasTexture(256, 512, (ctx, w, h) => {
    ctx.fillStyle = '#ffe3b0';
    ctx.fillRect(0, 0, w, h);
    ctx.strokeStyle = '#4a2412';
    ctx.lineWidth = 12;
    for (let i = 0; i <= 5; i += 1) {
      ctx.beginPath();
      ctx.moveTo((i * w) / 5, 0);
      ctx.lineTo((i * w) / 5, h);
      ctx.moveTo(0, (i * h) / 5);
      ctx.lineTo(w, (i * h) / 5);
      ctx.stroke();
    }
  });
  const shaft = canvasTexture(64, 256, (ctx, w, h) => {
    const gradient = ctx.createLinearGradient(0, 0, 0, h);
    gradient.addColorStop(0, 'rgba(255, 224, 170, .3)');
    gradient.addColorStop(1, 'rgba(255, 224, 170, 0)');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, w, h);
  });

  const windowMat = new THREE.MeshBasicMaterial({ map: lattice });
  const shaftMat = new THREE.MeshBasicMaterial({
    map: shaft,
    transparent: true,
    depthWrite: false,
    side: THREE.DoubleSide,
    blending: THREE.AdditiveBlending
  });

  [-24, -16, -8, 0, 8, 16].forEach((z, index) => {
    for (const side of [-1, 1]) {
      addPlane(scene, 4, 8, windowMat, side * (HALL.halfWidth - 0.05), 12, z, -side * Math.PI / 2);
      // Vệt nắng vẽ chồng lên nhau rất tốn, chỉ giữ cách một cửa
      if (index % 2 === 0) {
        const beam = addPlane(scene, 4, 19, shaftMat, side * (HALL.halfWidth - 6.2), 8.6, z);
        beam.rotation.z = side * -0.72;
      }
    }
  });
}

function buildPillars(scene) {
  const height = HALL.height;
  const obstacles = [];
  const lacquer = material(LACQUER, { roughness: 0.32 });
  const gold = goldMaterial();
  const stone = material('#8d7d68');

  for (const { x, radius } of PILLAR_ROWS) {
    const spots = PILLAR_Z.flatMap((z) => [{ x, z }, { x: -x, z }]);
    instanced(scene, new THREE.CylinderGeometry(radius, radius * 1.08, height, 28), lacquer, spots.map(({ x: px, z }) => ({ x: px, y: height / 2, z })), { shadow: true });
    instanced(scene, new THREE.CylinderGeometry(radius * 1.55, radius * 1.8, 0.8, 20), stone, spots.map(({ x: px, z }) => ({ x: px, y: 0.4, z })), { shadow: true });
    for (const y of [1.1, height - 1.7]) {
      instanced(scene, new THREE.CylinderGeometry(radius * 1.14, radius * 1.14, 0.5, 28), gold, spots.map(({ x: px, z }) => ({ x: px, y, z })));
    }
    spots.forEach((spot) => obstacles.push({ ...spot, radius: radius * 1.5 }));
  }

  // Rồng vàng cuốn quanh hàng cột trong, nhìn xa thành đường xoắn lộng lẫy
  const { x, radius } = PILLAR_ROWS[0];
  const points = [];
  for (let i = 0; i <= 150; i += 1) {
    const t = i / 150;
    const angle = t * Math.PI * 7;
    points.push(new THREE.Vector3(Math.cos(angle) * (radius + 0.1), 1.5 + t * (height - 3.6), Math.sin(angle) * (radius + 0.1)));
  }
  const coil = new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points), 220, 0.17, 6);
  instanced(scene, coil, gold, PILLAR_Z.flatMap((z) => [{ x, z }, { x: -x, z, ry: Math.PI }]));
  return obstacles;
}

function buildLotus(parent, x, y, z, scale) {
  const lotus = new THREE.Group();
  lotus.position.set(x, y, z);
  lotus.scale.setScalar(scale);
  parent.add(lotus);

  const petalGeometry = new THREE.SphereGeometry(0.5, 14, 10);
  const layers = [
    { count: 14, tilt: 1.3, distance: 0.82, color: '#ee8fa6' },
    { count: 12, tilt: 1, distance: 0.6, color: '#f6b4c3' }
  ];
  for (const layer of layers) {
    const mat = material(layer.color, { roughness: 0.45, emissive: '#7a2f42', emissiveIntensity: 0.25 });
    for (let i = 0; i < layer.count; i += 1) {
      const holder = new THREE.Group();
      holder.rotation.y = (i / layer.count) * Math.PI * 2;
      lotus.add(holder);
      const petal = addMesh(holder, petalGeometry, mat, 0, 0.3, layer.distance);
      petal.scale.set(0.5, 1, 0.2);
      petal.rotation.x = layer.tilt;
    }
  }
  return lotus;
}

// Tượng tạo dáng tối giản, không chi tiết gương mặt để giữ vẻ trang nghiêm khi nhìn từ xa
function buildStatue(scene, x, y, z) {
  const statue = new THREE.Group();
  statue.position.set(x, y, z);
  scene.add(statue);

  const gold = material('#eab64e', { metalness: 0.3, roughness: 0.34, emissive: '#7a4c0a', emissiveIntensity: 0.6 });
  const robe = material('#d99a35', { metalness: 0.3, roughness: 0.42, emissive: '#6b3e08', emissiveIntensity: 0.5 });
  const sphere = new THREE.SphereGeometry(1, 32, 24);

  const profile = [[0, 0], [3, 0.1], [3.1, 0.8], [2.5, 1.5], [2.05, 2.6], [2, 3.6], [2.15, 4.4], [2.05, 4.9], [1.25, 5.55], [0.72, 5.85], [0, 5.95]]
    .map(([px, py]) => new THREE.Vector2(px, py));
  const torso = addMesh(statue, new THREE.LatheGeometry(profile, 40), robe);
  torso.scale.z = 0.72;

  const legs = addMesh(statue, sphere, robe, 0, 0.85, 0.75);
  legs.scale.set(3.6, 0.95, 2.1);
  for (const side of [-1, 1]) {
    const arm = addMesh(statue, new THREE.CapsuleGeometry(0.55, 2.3, 8, 16), robe, side * 2.15, 2.9, 0.45);
    arm.rotation.set(0.45, 0, side * 0.22);
  }
  const hands = addMesh(statue, sphere, gold, 0, 1.75, 1.95);
  hands.scale.set(1.05, 0.34, 0.62);

  addMesh(statue, new THREE.CylinderGeometry(0.55, 0.65, 0.6, 20), gold, 0, 6.1, 0);
  const head = new THREE.Group();
  head.position.y = 7.25;
  statue.add(head);
  const face = addMesh(head, sphere, gold);
  face.scale.set(1.05, 1.28, 1.08);
  const hair = addMesh(head, new THREE.SphereGeometry(1.09, 32, 16, 0, Math.PI * 2, 0, Math.PI * 0.42), material('#33304f', { roughness: 0.6 }), 0, 0.12, -0.03);
  hair.scale.y = 1.2;
  addMesh(head, new THREE.SphereGeometry(0.5, 20, 16), material('#33304f', { roughness: 0.6 }), 0, 1.45, 0);
  for (const side of [-1, 1]) {
    const ear = addMesh(head, sphere, gold, side * 1.08, -0.15, 0);
    ear.scale.set(0.16, 0.6, 0.26);
  }
  return statue;
}

function buildMandala(scene) {
  const y = 11.5;
  const z = HALL.back + 0.3;
  const disc = canvasTexture(1024, 1024, (ctx, w) => {
    const c = w / 2;
    const glow = ctx.createRadialGradient(c, c, 60, c, c, c);
    glow.addColorStop(0, 'rgba(255, 236, 170, 1)');
    glow.addColorStop(0.6, 'rgba(255, 196, 92, .9)');
    glow.addColorStop(1, 'rgba(255, 170, 60, 0)');
    ctx.fillStyle = glow;
    ctx.fillRect(0, 0, w, w);
    ctx.strokeStyle = 'rgba(160, 90, 12, .9)';
    for (const radius of [230, 310, 400]) {
      ctx.lineWidth = 12;
      ctx.beginPath();
      ctx.arc(c, c, radius, 0, Math.PI * 2);
      ctx.stroke();
    }
    for (let ring = 0; ring < 2; ring += 1) {
      const count = 16 + ring * 8;
      for (let i = 0; i < count; i += 1) {
        const angle = (i / count) * Math.PI * 2;
        const radius = 270 + ring * 85;
        drawLotusMark(ctx, c + Math.cos(angle) * radius, c + Math.sin(angle) * radius, 26, 'rgba(160, 90, 12, .9)');
      }
    }
  });
  const rays = canvasTexture(1024, 1024, (ctx, w) => {
    const c = w / 2;
    ctx.translate(c, c);
    for (let i = 0; i < 48; i += 1) {
      ctx.rotate(Math.PI / 24);
      const gradient = ctx.createLinearGradient(0, 90, 0, c);
      gradient.addColorStop(0, 'rgba(255, 226, 150, .9)');
      gradient.addColorStop(1, 'rgba(255, 226, 150, 0)');
      ctx.fillStyle = gradient;
      ctx.beginPath();
      ctx.moveTo(-16, 90);
      ctx.lineTo(i % 2 ? 7 : 3, c);
      ctx.lineTo(i % 2 ? -7 : -3, c);
      ctx.lineTo(16, 90);
      ctx.fill();
    }
  });

  const haloRays = addPlane(scene, 30, 30, new THREE.MeshBasicMaterial({ map: rays, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, opacity: 0.25 }), 0, y, z);
  const halo = addPlane(scene, 18, 18, new THREE.MeshBasicMaterial({ map: disc, transparent: true, depthWrite: false, opacity: 0.55 }), 0, y, z + 0.1);
  const ring = addMesh(scene, new THREE.TorusGeometry(7.2, 0.13, 10, 90), goldMaterial(), 0, y, z + 0.2);
  ring.castShadow = false;
  return { halo, haloRays };
}

function buildStairsAndAltar(scene) {
  const stone = material('#7c3a22', { roughness: 0.45 });
  const edge = goldMaterial();
  const stepDepth = 0.9;
  const startZ = STAIRS_FRONT_Z;
  const steps = Array.from({ length: STEP_COUNT }, (_, i) => {
    const top = ((i + 1) / STEP_COUNT) * DAIS_Y;
    return { y: top / 2, z: startZ - i * stepDepth - stepDepth / 2, sy: top };
  });
  instanced(scene, new THREE.BoxGeometry(36, 1, stepDepth), stone, steps);
  instanced(scene, new THREE.BoxGeometry(36, 0.05, 0.1), edge, steps.map(({ z, sy }) => ({ y: sy + 0.02, z: z + stepDepth / 2 - 0.05 })));

  const daisFront = startZ - STEP_COUNT * stepDepth;
  const daisDepth = daisFront - HALL.back;
  addMesh(scene, new THREE.BoxGeometry(HALL.halfWidth * 2, DAIS_Y, daisDepth), stone, 0, DAIS_Y / 2, daisFront - daisDepth / 2);

  // Bàn thờ nhiều tầng, mỗi tầng một hàng nến
  const altarZ = -23;
  const lacquer = material('#8c2216', { roughness: 0.34 });
  const gold = goldMaterial();
  const tiers = [{ w: 18, h: 1.5, d: 3.4, z: altarZ }, { w: 14, h: 1.1, d: 2.2, z: altarZ - 2.2 }];
  let top = DAIS_Y;
  const candles = [];
  for (const tier of tiers) {
    addMesh(scene, new THREE.BoxGeometry(tier.w, tier.h, tier.d), lacquer, 0, top + tier.h / 2, tier.z);
    top += tier.h;
    addMesh(scene, new THREE.BoxGeometry(tier.w + 0.4, 0.14, tier.d + 0.4), gold, 0, top + 0.07, tier.z);
    for (let x = -tier.w / 2 + 1; x <= tier.w / 2 - 1; x += 1.25) {
      if (Math.abs(x) > 1.3) candles.push({ x, y: top + 0.14, z: tier.z + tier.d / 2 - 0.5 });
    }
  }
  instanced(scene, new THREE.CylinderGeometry(0.08, 0.08, 0.6, 8), material('#fff1d6'), candles.map((c) => ({ ...c, y: c.y + 0.3 })));
  instanced(scene, new THREE.SphereGeometry(0.1, 8, 6), new THREE.MeshBasicMaterial({ color: '#ffc05a' }), candles.map((c) => ({ ...c, y: c.y + 0.72, sy: 1.8 })));

  // Tòa sen, tượng và hoành phi
  const statueZ = -31;
  addMesh(scene, new THREE.CylinderGeometry(4.6, 5.8, 2.6, 40), gold, 0, DAIS_Y + 1.3, statueZ);
  addMesh(scene, new THREE.CylinderGeometry(4.2, 4.2, 0.9, 40), lacquer, 0, DAIS_Y + 3, statueZ);
  buildLotus(scene, 0, DAIS_Y + 3.3, statueZ, 5.6);
  buildStatue(scene, 0, DAIS_Y + 4, statueZ);

  const plaque = canvasTexture(1400, 240, (ctx, w, h) => {
    ctx.fillStyle = '#7a1f12';
    ctx.fillRect(0, 0, w, h);
    ctx.strokeStyle = GOLD;
    ctx.lineWidth = 14;
    ctx.strokeRect(14, 14, w - 28, h - 28);
    ctx.fillStyle = '#f7d27e';
    ctx.font = '700 120px "Times New Roman", serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('ĐẠI HÙNG BẢO ĐIỆN', w / 2, h / 2 + 6);
  });
  addPlane(scene, 15, 2.57, new THREE.MeshBasicMaterial({ map: plaque }), 0, 18.2, -11.6);
}

function buildFurnishings(scene) {
  const bronze = material('#8a5a22', { metalness: 0.4, roughness: 0.4, emissive: '#3a2206', emissiveIntensity: 0.5 });
  const gold = goldMaterial();

  // Đỉnh hương lớn giữa lối đi
  const urnZ = -12.6;
  const urnProfile = [[0, 0], [1.3, 0], [1.1, 0.4], [0.6, 0.7], [1.5, 1.1], [1.75, 1.9], [1.5, 2.6], [1.65, 2.75], [0, 2.75]]
    .map(([x, y]) => new THREE.Vector2(x, y));
  addMesh(scene, new THREE.LatheGeometry(urnProfile, 28), bronze, 0, 0, urnZ);
  const incense = [];
  for (let i = 0; i < 12; i += 1) {
    const angle = (i / 12) * Math.PI * 2;
    incense.push({ x: Math.cos(angle) * 0.7, y: 3.4, z: urnZ + Math.sin(angle) * 0.7 });
  }
  instanced(scene, new THREE.CylinderGeometry(0.03, 0.03, 1.3, 6), material('#b5532a'), incense);

  // Chuông và trống hai bên
  const frame = material('#5a2a14');
  for (const side of [-1, 1]) {
    const x = side * 12;
    for (const offset of [-1.5, 1.5]) addMesh(scene, new THREE.BoxGeometry(0.3, 6, 0.3), frame, x + offset, 3, -11);
    addMesh(scene, new THREE.BoxGeometry(3.6, 0.35, 0.4), frame, x, 6.1, -11);
  }
  const bellProfile = [[0, 3], [0.5, 3], [0.8, 2.6], [0.9, 1], [1.2, 0.2], [1.3, 0]].map(([x, y]) => new THREE.Vector2(x, y));
  addMesh(scene, new THREE.LatheGeometry(bellProfile, 28), bronze, -12, 2.8, -11);
  const drum = addMesh(scene, new THREE.CylinderGeometry(1.25, 1.25, 1.5, 28), material('#a3261a', { roughness: 0.4 }), 12, 3.6, -11);
  drum.rotation.x = Math.PI / 2;
  for (const offset of [-0.76, 0.76]) {
    const skin = addMesh(scene, new THREE.CylinderGeometry(1.15, 1.15, 0.03, 28), material('#e8d3a6'), 12, 3.6, -11 + offset);
    skin.rotation.x = Math.PI / 2;
  }

  // Đèn lồng treo dọc hai bên lối đi
  const lanternMat = new THREE.MeshBasicMaterial({ color: '#ffb35c' });
  const lanternSpots = [-26, -16, -8, 0, 8, 16].flatMap((z) => [-11.6, -5, 5, 11.6].map((x) => ({ x, z })));
  instanced(scene, new THREE.SphereGeometry(0.62, 14, 12), lanternMat, lanternSpots.map((s) => ({ ...s, y: 13.6, sy: 1.2 })));
  instanced(scene, new THREE.CylinderGeometry(0.34, 0.34, 0.14, 12), gold, lanternSpots.flatMap((s) => [
    { ...s, y: 14.4 },
    { ...s, y: 12.8 }
  ]));
  instanced(scene, new THREE.CylinderGeometry(0.03, 0.03, 5.4, 5), gold, lanternSpots.map((s) => ({ ...s, y: 17.1 })));

  // Phướn đỏ treo giữa các cột
  const banner = canvasTexture(256, 1024, (ctx, w, h) => {
    ctx.fillStyle = '#9c1f14';
    ctx.fillRect(0, 0, w, h);
    ctx.strokeStyle = GOLD;
    ctx.lineWidth = 12;
    ctx.strokeRect(14, 14, w - 28, h - 28);
    ctx.fillStyle = '#f7d27e';
    ctx.font = '700 78px "Times New Roman", serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ['NAM', 'MÔ', 'A', 'DI', 'ĐÀ', 'PHẬT'].forEach((word, index) => {
      ctx.fillText(word, w / 2, 130 + index * 152);
    });
  });
  const bannerSpots = [-24, -16, -8, 0, 8, 16].flatMap((z) => [-8.5, 8.5].map((x) => ({ x, z })));
  const bannerMesh = instanced(
    scene,
    new THREE.PlaneGeometry(2, 8),
    new THREE.MeshBasicMaterial({ map: banner, side: THREE.DoubleSide, color: '#e6d6c0' }),
    bannerSpots.map(({ x, z }) => ({ x, y: 14.6, z, ry: Math.sign(x) * -Math.PI / 2 }))
  );
  bannerMesh.receiveShadow = false;

  return [{ x: 0, z: urnZ, radius: 1.9 }, { x: -12, z: -11, radius: 2.1 }, { x: 12, z: -11, radius: 2.1 }];
}

function buildCarpet(scene) {
  const pattern = canvasTexture(256, 256, (ctx, w, h) => {
    ctx.fillStyle = '#8e1a1a';
    ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = GOLD;
    ctx.fillRect(0, 0, 18, h);
    ctx.fillRect(w - 18, 0, 18, h);
    drawLotusMark(ctx, w / 2, h / 2, 62, GOLD);
  });
  pattern.wrapT = THREE.RepeatWrapping;
  pattern.repeat.set(1, 10);
  const length = HALL.front + 14;
  const carpet = addPlane(scene, 4, length, material('#ffffff', { map: pattern }), 0, 0.012, HALL.front - length / 2);
  carpet.rotation.x = -Math.PI / 2;
}

function buildCushions(scene) {
  const cushions = CUSHION_Z.flatMap((z) => CUSHION_X.map((x) => ({ x, z })));
  const spots = cushions.map(({ x, z }) => ({ x, z }));
  instanced(scene, new THREE.BoxGeometry(1.8, 0.04, 1.8), material('#8e1f1f'), spots.map((s) => ({ ...s, y: 0.03 })));
  instanced(scene, new THREE.CylinderGeometry(0.72, 0.8, 0.2, 24), material('#c79245'), spots.map((s) => ({ ...s, y: 0.14 })));
  return cushions;
}

function buildGoldDust(scene) {
  const count = 240;
  const positions = new Float32Array(count * 3);
  for (let i = 0; i < count; i += 1) {
    positions[i * 3] = (Math.random() - 0.5) * 36;
    positions[i * 3 + 1] = Math.random() * 16;
    positions[i * 3 + 2] = HALL.back + Math.random() * 50;
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  const dust = new THREE.Points(geometry, new THREE.PointsMaterial({
    color: '#ffd98a',
    size: 0.09,
    transparent: true,
    opacity: 0.75,
    depthWrite: false,
    blending: THREE.AdditiveBlending
  }));
  scene.add(dust);
  return dust;
}

export function buildTemple(root) {
  // Đèn và trời dùng chung cho cả sân; phần còn lại nằm trong nhóm chánh điện để ẩn được khi ra sân
  const scene = new THREE.Group();
  root.add(scene);
  root.background = new THREE.Color('#a9d2ea');
  root.fog = new THREE.Fog('#2c160a', 34, 92);
  const hemi = new THREE.HemisphereLight('#ffe9cc', '#7a3c1c', 2.3);
  root.add(hemi);

  const sun = new THREE.DirectionalLight('#ffe0b0', 1.5);
  sun.position.set(10, 19, 16);
  sun.target.position.set(0, 0, -6);
  sun.castShadow = true;
  sun.shadow.mapSize.set(1024, 1024);
  Object.assign(sun.shadow.camera, { left: -30, right: 30, top: 34, bottom: -34, far: 70 });
  sun.shadow.bias = -0.0006;
  root.add(sun, sun.target);

  // Mỗi đèn điểm tốn thêm trên mọi điểm ảnh, chỉ dành một đèn cho khu bàn thờ
  const altarLight = new THREE.PointLight('#ffb871', 300, 40, 1.6);
  altarLight.position.set(0, 9, -22);
  scene.add(altarLight);

  buildShell(scene);
  buildWindows(scene);
  const obstacles = buildPillars(scene);
  buildCarpet(scene);
  buildStairsAndAltar(scene);
  const { halo, haloRays } = buildMandala(scene);
  obstacles.push(...buildFurnishings(scene));
  const cushions = buildCushions(scene);
  const dust = buildGoldDust(scene);

  const dustPositions = dust.geometry.attributes.position;
  function animate(dt) {
    haloRays.rotation.z += dt * 0.05;
    for (let i = 0; i < dustPositions.count; i += 1) {
      const y = dustPositions.getY(i) + dt * 0.22;
      dustPositions.setY(i, y > 16 ? 0 : y);
    }
    dustPositions.needsUpdate = true;
  }

  return { hall: scene, hemi, obstacles, cushions, halo, haloRays, animate };
}
