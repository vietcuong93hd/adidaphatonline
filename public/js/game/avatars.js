import * as THREE from 'three';

// Mọi nhân vật nhìn về +z, gốc ở chân; update() chỉ lo chuyển động riêng của từng dạng
const material = (color, options = {}) => new THREE.MeshStandardMaterial({ color, roughness: 0.6, ...options });
const flat = (color) => new THREE.MeshBasicMaterial({ color });
const sphere = new THREE.SphereGeometry(1, 18, 12);

function addMesh(parent, geometry, mat, x = 0, y = 0, z = 0) {
  const mesh = new THREE.Mesh(geometry, mat);
  mesh.position.set(x, y, z);
  parent.add(mesh);
  return mesh;
}

function addBlob(parent, mat, [x, y, z], [sx, sy, sz]) {
  const mesh = addMesh(parent, sphere, mat, x, y, z);
  mesh.scale.set(sx, sy, sz);
  return mesh;
}

function addEyes(parent, y, z, spread, radius, shine = true) {
  const eyeMat = flat('#20130b');
  for (const side of [-1, 1]) {
    addBlob(parent, eyeMat, [side * spread, y, z], [radius, radius, radius * 0.7]);
    if (shine) addBlob(parent, flat('#ffffff'), [side * spread + radius * 0.3, y + radius * 0.35, z + radius * 0.6], [radius * 0.32, radius * 0.32, radius * 0.2]);
  }
}

function addEars(head, style, mat, accent) {
  for (const side of [-1, 1]) {
    if (style === 'pointed') {
      addMesh(head, new THREE.ConeGeometry(0.19, 0.38, 12), mat, side * 0.32, 0.48, 0).rotation.z = -side * 0.28;
    } else if (style === 'round') {
      addBlob(head, mat, [side * 0.4, 0.42, 0], [0.19, 0.19, 0.14]);
    } else if (style === 'horn') {
      addBlob(head, mat, [side * 0.56, 0.14, 0], [0.17, 0.1, 0.1]);
      const horn = addMesh(head, new THREE.TorusGeometry(0.26, 0.07, 8, 14, Math.PI * 0.75), material('#efe3c8'), side * 0.5, 0.44, 0);
      horn.rotation.set(0, side > 0 ? 0 : Math.PI, 0.1);
    } else if (style === 'long') {
      const ear = addBlob(head, mat, [side * 0.22, 0.86, -0.02], [0.13, 0.46, 0.09]);
      ear.rotation.z = -side * 0.12;
      addBlob(head, accent, [side * 0.22, 0.86, 0.05], [0.07, 0.34, 0.05]).rotation.z = -side * 0.12;
    } else if (style === 'tuft') {
      addMesh(head, new THREE.ConeGeometry(0.15, 0.34, 8), mat, side * 0.36, 0.5, 0).rotation.z = -side * 0.5;
    } else if (style === 'antenna') {
      const stalk = addMesh(head, new THREE.CylinderGeometry(0.02, 0.02, 0.42, 6), flat('#3a2a1a'), side * 0.2, 0.62, 0.08);
      stalk.rotation.z = -side * 0.4;
      addBlob(head, flat('#3a2a1a'), [side * 0.29, 0.82, 0.08], [0.06, 0.06, 0.06]);
    }
  }
}

function addFace(head, { snout, belly, eyeSize }) {
  const muzzleMat = material(belly);
  if (snout === 'long') {
    addBlob(head, muzzleMat, [0, -0.13, 0.44], [0.24, 0.17, 0.24]);
    addBlob(head, flat('#20130b'), [0, -0.07, 0.67], [0.065, 0.05, 0.05]);
  } else if (snout === 'short') {
    addBlob(head, muzzleMat, [0, -0.15, 0.4], [0.24, 0.17, 0.17]);
    addBlob(head, flat('#20130b'), [0, -0.09, 0.56], [0.065, 0.05, 0.05]);
  } else if (snout === 'bunny') {
    addBlob(head, muzzleMat, [0, -0.15, 0.42], [0.18, 0.13, 0.13]);
    addBlob(head, flat('#f48fa0'), [0, -0.09, 0.54], [0.05, 0.04, 0.04]);
  } else if (snout === 'beak') {
    const beak = addMesh(head, new THREE.ConeGeometry(0.11, 0.24, 10), material('#f2a33a'), 0, -0.06, 0.56);
    beak.rotation.x = Math.PI / 2;
  }
  addEyes(head, 0.09, 0.47, 0.24, eyeSize);
}

function addExtras(body, head, { extras = [], accent }) {
  const accentMat = accent && material(accent);

  if (extras.includes('stripes')) {
    for (const y of [0.32, 0.56, 0.78]) {
      const stripe = addMesh(body, new THREE.TorusGeometry(y === 0.56 ? 0.49 : 0.42, 0.055, 8, 28), accentMat, 0, y, 0);
      stripe.rotation.x = Math.PI / 2;
    }
  }
  if (extras.includes('sheerWings')) {
    const wingMat = new THREE.MeshBasicMaterial({ color: '#dff3ff', transparent: true, opacity: 0.7 });
    for (const side of [-1, 1]) addBlob(body, wingMat, [side * 0.42, 0.86, -0.34], [0.34, 0.2, 0.05]).rotation.z = side * 0.5;
  }
  if (extras.includes('wings')) {
    for (const side of [-1, 1]) addBlob(body, accentMat, [side * 0.46, 0.52, -0.02], [0.13, 0.34, 0.26]).rotation.z = side * 0.25;
  }
  if (extras.includes('mane')) {
    for (let i = 0; i < 6; i += 1) addBlob(head, accentMat, [0, 0.5 - i * 0.2, -0.3 - i * 0.04], [0.09, 0.16, 0.13]);
  }
  if (extras.includes('crest')) {
    for (const z of [-0.08, 0.08]) addBlob(head, accentMat, [0, 0.54, z], [0.06, 0.13, 0.06]);
  }
  if (extras.includes('ring')) {
    addMesh(head, new THREE.TorusGeometry(0.08, 0.02, 6, 14), material('#e0ac45'), 0, -0.2, 0.58);
  }
  if (extras.includes('spots')) {
    const spots = [[-0.32, 0.62, 0.24], [0.3, 0.42, 0.28], [-0.2, 0.34, 0.36], [0.36, 0.72, 0.1], [-0.42, 0.42, -0.1], [0.16, 0.74, -0.34], [-0.14, 0.5, -0.42], [0.36, 0.34, -0.22]];
    for (const [x, y, z] of spots) addBlob(body, accentMat, [x, y, z], [0.075, 0.075, 0.03]);
    for (const [x, y, z] of [[-0.3, 0.3, 0.3], [0.32, 0.22, 0.32], [0, 0.46, -0.48]]) addBlob(head, accentMat, [x, y, z], [0.06, 0.06, 0.03]);
  }
  if (extras.includes('rainbow')) {
    const colors = ['#f25f5c', '#ffe066', '#50b4e0', '#c77dff', '#ff9f43', '#f25f5c', '#50b4e0', '#ffe066'];
    const bands = [[-0.3, 0.6, 0.28], [0.28, 0.4, 0.32], [0.36, 0.72, 0.1], [-0.42, 0.4, -0.1], [0.16, 0.74, -0.34], [-0.16, 0.5, -0.42], [0.38, 0.34, -0.22], [0, 0.8, 0.24]];
    bands.forEach(([x, y, z], index) => addBlob(body, material(colors[index]), [x, y, z], [0.1, 0.1, 0.04]));
  }
}

function addTail(body, style, mat, tipMat) {
  const tail = new THREE.Group();
  tail.position.set(0, 0.42, -0.42);
  body.add(tail);

  if (style === 'bushy') {
    addBlob(tail, mat, [0, 0.26, -0.16], [0.2, 0.38, 0.2]).rotation.x = -0.5;
    if (tipMat) addBlob(tail, tipMat, [0, 0.56, -0.32], [0.13, 0.16, 0.13]);
  } else if (style === 'thin') {
    const curve = new THREE.QuadraticBezierCurve3(new THREE.Vector3(0, 0, 0), new THREE.Vector3(0, 0.1, -0.6), new THREE.Vector3(0, 0.6, -0.56));
    addMesh(tail, new THREE.TubeGeometry(curve, 10, 0.05, 6), mat);
  } else if (style === 'curl') {
    addMesh(tail, new THREE.TorusGeometry(0.2, 0.07, 8, 20, Math.PI * 1.7), mat, 0, 0.12, -0.2).rotation.y = Math.PI / 2;
  } else {
    addBlob(tail, mat, [0, 0, 0], [0.14, 0.14, 0.14]);
  }
  return tail;
}

function createAnimal(config) {
  const { fur, belly, ears, tail: tailStyle, tailColor, tailTip, snout, eyeSize = 0.075, accent } = config;
  const group = new THREE.Group();
  const body = new THREE.Group();
  group.add(body);

  const furMat = material(fur);
  const bellyMat = material(belly);

  addBlob(body, furMat, [0, 0.5, 0], [0.5, 0.52, 0.46]);
  addBlob(body, bellyMat, [0, 0.46, 0.2], [0.33, 0.36, 0.3]);
  for (const side of [-1, 1]) {
    addBlob(body, furMat, [side * 0.24, 0.1, 0.2], [0.15, 0.1, 0.19]);
    addBlob(body, furMat, [side * 0.42, 0.56, 0.14], [0.11, 0.17, 0.11]).rotation.z = side * 0.5;
  }

  const head = new THREE.Group();
  head.position.y = 1.2;
  body.add(head);
  addBlob(head, furMat, [0, 0, 0], [0.58, 0.52, 0.52]);
  addEars(head, ears, furMat, accent && material(accent));
  addFace(head, { snout, belly, eyeSize });
  for (const side of [-1, 1]) {
    addBlob(head, flat('#ff9fae'), [side * 0.38, -0.08, 0.33], [0.09, 0.05, 0.03]).rotation.y = side * 0.75;
  }
  addExtras(body, head, config);

  const tailMat = tailColor ? material(tailColor) : furMat;
  const tail = addTail(body, tailStyle, tailMat, tailTip && material(tailTip));

  let clock = 0;
  return {
    group,
    update(dt, { moving, sitting }) {
      clock += dt;
      const targetScale = sitting ? 0.86 : 1;
      body.scale.y += (targetScale - body.scale.y) * Math.min(1, dt * 8);
      body.position.y = moving ? Math.abs(Math.sin(clock * 10)) * 0.1 : Math.sin(clock * 2) * 0.012;
      body.rotation.z = moving ? Math.sin(clock * 10) * 0.08 : 0;
      tail.rotation.y = Math.sin(clock * (moving ? 12 : 3)) * 0.35;
    }
  };
}

const SERPENT_SEGMENTS = 90;
const SERPENT_BAND_EVERY = 9;

function coilPose(u, target) {
  const angle = u * Math.PI * 6;
  const radius = 0.72 * (1 - u * 0.92);
  return target.set(Math.cos(angle) * radius, 0.17 + u * 1.3, Math.sin(angle) * radius);
}

function slitherPose(u, clock, target) {
  const lift = Math.max(0, u - 0.72) / 0.28;
  const wave = Math.sin(u * 11 - clock * 9) * 0.24 * (1 - lift);
  return target.set(wave, 0.17 + lift * lift * 0.85, (u - 0.8) * 3.1);
}

function segmentRadius(u, thickness) {
  return (0.05 + 0.15 * Math.sin(Math.min(1, u * 1.2) * Math.PI * 0.62)) * thickness;
}

function createSerpent({ skin, band, hood, thickness = 1 }) {
  const group = new THREE.Group();
  const skinMat = material(skin, { roughness: 0.4 });
  const bandMat = material(band, { roughness: 0.35 });

  // Một InstancedMesh để cả thân chỉ tốn một lần vẽ
  const body = new THREE.InstancedMesh(sphere, material('#ffffff', { roughness: 0.4 }), SERPENT_SEGMENTS);
  body.frustumCulled = false;
  const skinColor = new THREE.Color(skin);
  const bandColor = new THREE.Color(band);
  for (let i = 0; i < SERPENT_SEGMENTS; i += 1) {
    body.setColorAt(i, i % SERPENT_BAND_EVERY < 2 ? bandColor : skinColor);
  }
  group.add(body);

  const head = new THREE.Group();
  group.add(head);

  if (hood) {
    // Mang rắn xòe sau đầu, người chơi chủ yếu nhìn từ sau nên mặt sau cũng có vân
    addBlob(head, skinMat, [0, 0.12, -0.1], [0.62, 0.68, 0.14]);
    addBlob(head, bandMat, [0, 0.1, -0.02], [0.46, 0.52, 0.09]);
    for (const x of [-0.22, 0.22]) addBlob(head, bandMat, [x, 0.2, -0.22], [0.13, 0.17, 0.05]);
  }
  addBlob(head, skinMat, [0, 0.05, 0.16], [0.3, 0.25, 0.34]);
  addEyes(head, 0.14, 0.44, 0.17, 0.085);
  for (const x of [-0.25, 0.25]) addBlob(head, flat('#ff9fae'), [x, 0.02, 0.34], [0.07, 0.04, 0.03]);
  head.scale.setScalar(0.68);

  const position = new THREE.Vector3();
  const target = new THREE.Vector3();
  const matrix = new THREE.Matrix4();
  let clock = 0;
  let blend = 0;

  return {
    group,
    update(dt, { moving, sitting }) {
      clock += dt;
      blend += ((moving ? 1 : 0) - blend) * Math.min(1, dt * 7);

      const breath = sitting ? Math.sin(clock * 1.4) * 0.02 : 0;
      for (let i = 0; i < SERPENT_SEGMENTS; i += 1) {
        const u = i / (SERPENT_SEGMENTS - 1);
        coilPose(u, position);
        slitherPose(u, clock, target);
        position.lerp(target, blend);
        position.y += breath * u;
        const radius = segmentRadius(u, thickness);
        matrix.makeScale(radius, radius, radius).setPosition(position);
        body.setMatrixAt(i, matrix);
      }
      body.instanceMatrix.needsUpdate = true;

      const sway = Math.sin(clock * 1.6) * 0.06 * (1 - blend);
      head.position.set(position.x + sway, position.y + 0.16, position.z + 0.06);
      head.rotation.y = -sway;
    }
  };
}

// Bóng tròn giả thay cho bóng thật: bóng thật của đại điện chỉ tính một lần cho nhẹ
const blobGeometry = new THREE.CircleGeometry(0.7, 20);
const blobMaterial = new THREE.MeshBasicMaterial({ color: '#000000', transparent: true, opacity: 0.3, depthWrite: false });

export function addBlobShadow(parent) {
  const blob = new THREE.Mesh(blobGeometry, blobMaterial);
  blob.rotation.x = -Math.PI / 2;
  blob.position.y = 0.04;
  parent.add(blob);
}

const animal = (config) => () => createAnimal(config);
const serpent = (config) => () => createSerpent(config);

// Thứ tự, tên, đặc điểm và câu cửa miệng theo bảng "Sở thú công sở"
export const AVATARS = {
  trau: {
    label: 'Trâu',
    title: 'Trâu cày',
    blurb: 'Ai cũng bảo “em giỏi nên anh mới giao”. Giỏi thêm chút nữa chắc gánh luôn tiền thuê văn phòng.',
    quote: 'Để đấy em làm nốt…',
    create: animal({ fur: '#5f6675', belly: '#aab1bf', ears: 'horn', tail: 'thin', snout: 'short', extras: ['ring'] })
  },
  ngua: {
    label: 'Ngựa',
    title: 'Ngựa chiến',
    blurb: 'Dự án khó gọi tên, khách khó gọi tên, cứu deal cũng gọi tên. Tăng lương thì gọi người khác.',
    quote: 'Gửi brief đây, em chạy!',
    create: animal({ fur: '#a8683a', belly: '#ecd0a8', accent: '#3d2413', ears: 'pointed', tail: 'bushy', tailColor: '#3d2413', snout: 'long', extras: ['mane'] })
  },
  ong: {
    label: 'Ong',
    title: 'Ong thợ',
    blurb: 'Âm thầm làm hết việc. Cuối năm nhận danh hiệu “người ít xuất hiện trong ảnh team nhất”.',
    quote: 'Em gửi bản hoàn chỉnh rồi ạ.',
    create: animal({ fur: '#f6c744', belly: '#fbe38a', accent: '#3a2a1a', ears: 'antenna', tail: 'stub', snout: 'none', extras: ['stripes', 'sheerWings'] })
  },
  chimlon: {
    label: 'Chim lợn',
    title: 'Chim lợn',
    blurb: 'Sếp chưa ra quyết định đã biết. Đồng nghiệp chưa nghỉ việc đã tổ chức chia tay trong đầu.',
    quote: 'Tao kể riêng mày thôi nhé…',
    create: animal({ fur: '#d8b588', belly: '#fff4e2', accent: '#b98f5e', ears: 'none', tail: 'stub', snout: 'beak', eyeSize: 0.09, extras: ['wings'] })
  },
  naga: {
    label: 'Mãng xà',
    title: 'Mãng xà',
    blurb: 'Ngồi im tưởng hiền. Mở miệng một câu, cả phòng phải đi chữa lành.',
    quote: 'Em hỏi để hiểu thôi: thế cả tuần rồi anh làm gì ạ?',
    create: serpent({ skin: '#46b583', band: '#e0b050', hood: true })
  },
  luon: {
    label: 'Lươn',
    title: 'Lươn chúa',
    blurb: 'Việc trượt khỏi người còn mượt hơn bấm chuyển tiếp email.',
    quote: 'Em tưởng phần này bên anh phụ trách?',
    create: serpent({ skin: '#8a7a3c', band: '#c9b56a', hood: false, thickness: 0.8 })
  },
  fox: {
    label: 'Cáo',
    title: 'Cáo già',
    blurb: 'Chưa cần tranh luận. Chỉ nhẹ nhàng đính kèm email cũ, tô vàng đúng một dòng.',
    quote: 'Như nội dung mình đã thống nhất…',
    create: animal({ fur: '#ef8d42', belly: '#fff3e4', ears: 'pointed', tail: 'bushy', tailTip: '#fff3e4', snout: 'long' })
  },
  ga: {
    label: 'Gà',
    title: 'Gà mờ',
    blurb: 'Nhiệt tình, trong sáng, chưa hiểu tại sao đồng nghiệp nghe chữ “họp nhanh” lại thở dài.',
    quote: 'Họp nhanh là khoảng 5 phút hả anh?',
    create: animal({ fur: '#ffdf5c', belly: '#fff0a8', accent: '#f2b632', ears: 'none', tail: 'stub', snout: 'beak', extras: ['wings', 'crest'] })
  },
  tho: {
    label: 'Thỏ',
    title: 'Thỏ đế',
    blurb: 'Trong đầu phản biện 20 ý. Đến lượt phát biểu thì mạng tự nhiên yếu.',
    quote: 'Dạ… em cũng giống ý mọi người.',
    create: animal({ fur: '#f4efe8', belly: '#ffffff', accent: '#f7b6c2', ears: 'long', tail: 'stub', snout: 'bunny' })
  },
  tacke: {
    label: 'Tắc kè',
    title: 'Tắc kè hoa',
    blurb: 'Trước họp chê phương án hết lời. Sếp vừa chọn, lập tức nhìn ra tiềm năng.',
    quote: 'Em cũng định đề xuất hướng này!',
    create: animal({ fur: '#5fc26b', belly: '#f4e27a', ears: 'none', tail: 'curl', snout: 'short', eyeSize: 0.1, extras: ['rainbow'] })
  },
  cu: {
    label: 'Cú',
    title: 'Cú đêm',
    blurb: '10 giờ sáng chưa thấy đâu. 2 giờ sáng gửi file kèm lời nhắn đầy sức sống.',
    quote: 'Mọi người check giúp em chút nhé.',
    create: animal({ fur: '#4b4372', belly: '#c2bbdf', accent: '#352f55', ears: 'tuft', tail: 'stub', snout: 'beak', eyeSize: 0.11, extras: ['wings'] })
  },
  bao: {
    label: 'Báo',
    title: 'Báo thủ',
    blurb: 'Một cú click, cả phòng có thêm công việc. Luôn xuất hiện cùng câu “hình như”.',
    quote: 'Hình như em vừa xoá nhầm bản cuối…',
    create: animal({ fur: '#efb949', belly: '#fff1cf', accent: '#4a2f16', ears: 'round', tail: 'thin', snout: 'short', extras: ['spots'] })
  }
};
