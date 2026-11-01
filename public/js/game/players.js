import * as THREE from 'three';
import { AVATARS, addBlobShadow } from './avatars.js';
import { Nameplate } from './labels.js';
import { createHeadHalo } from './headHalo.js';

const CUSHION_TOP = 0.24;
const FOLLOW_SPEED = 6; // server gửi vị trí 5 lần mỗi giây, thấp hơn nữa sẽ thấy đi trễ
const PULSE_SECONDS = 0.35;
const MAX_VISIBLE = 30; // phòng đông chỉ vẽ người gần nhất để điện thoại không lag
const VISIBLE_CHECK_SECONDS = 0.5;

const formOf = (form) => (Object.hasOwn(AVATARS, form) ? form : 'trau');

export function pulseScale(left) {
  return 1 + Math.sin((left / PULSE_SECONDS) * Math.PI) * 0.14;
}

export function createOtherPlayers(scene) {
  const others = new Map();
  let visibleCheckLeft = 0;

  function createAvatar(entry) {
    entry.avatar = AVATARS[formOf(entry.form)].create();
    entry.root.add(entry.avatar.group);
  }

  function setForm(entry, form) {
    entry.form = form;
    if (!entry.avatar) return; // chưa được vẽ thì để lúc hiện mới dựng hình
    entry.root.remove(entry.avatar.group);
    createAvatar(entry);
  }

  function add({ id, name, form, x, z, ry, moving, sitting }) {
    const root = new THREE.Group();
    root.position.set(x, sitting ? CUSHION_TOP : 0, z);
    root.rotation.y = ry;
    root.visible = false;
    addBlobShadow(root);
    scene.add(root);

    others.set(id, {
      root,
      form,
      avatar: null,
      plate: new Nameplate(root, name),
      halo: createHeadHalo(root),
      target: { x, z, ry, moving, sitting },
      pulse: 0
    });
    visibleCheckLeft = 0;
  }

  function remove(id) {
    const entry = others.get(id);
    if (!entry) return;
    entry.plate.destroy();
    scene.remove(entry.root);
    others.delete(id);
    visibleCheckLeft = 0;
  }

  function showNearest(center) {
    const nearest = [...others.values()]
      .sort((a, b) => a.root.position.distanceToSquared(center) - b.root.position.distanceToSquared(center));
    nearest.forEach((entry, rank) => {
      entry.root.visible = rank < MAX_VISIBLE;
      if (entry.root.visible && !entry.avatar) createAvatar(entry);
    });
  }

  return {
    add,
    remove,
    clear() {
      [...others.keys()].forEach(remove);
    },
    count: () => others.size,
    // Mỗi phần tử là [id, x, z, ry, cờ], xem packPosition ở lib/gameRoom.js
    applyState(list, selfId) {
      for (const [id, x, z, ry, flags] of list) {
        const entry = others.get(id);
        if (id !== selfId && entry) entry.target = { x, z, ry, moving: Boolean(flags & 1), sitting: Boolean(flags & 2) };
      }
    },
    setProfile({ id, name, form }) {
      const entry = others.get(id);
      if (!entry) return;
      entry.plate.setName(name);
      setForm(entry, form);
    },
    say(id, text) {
      others.get(id)?.plate.say(text);
    },
    pulse(id) {
      const entry = others.get(id);
      if (entry) entry.pulse = PULSE_SECONDS;
    },
    lightHalo(id) {
      others.get(id)?.halo.light();
    },
    update(dt, center) {
      visibleCheckLeft -= dt;
      if (visibleCheckLeft <= 0) {
        visibleCheckLeft = VISIBLE_CHECK_SECONDS;
        showNearest(center);
      }

      const blend = Math.min(1, dt * FOLLOW_SPEED);
      for (const entry of others.values()) {
        const { root, avatar, plate, target } = entry;
        root.position.x += (target.x - root.position.x) * blend;
        root.position.z += (target.z - root.position.z) * blend;
        root.position.y += ((target.sitting ? CUSHION_TOP : 0) - root.position.y) * blend;
        const turn = Math.atan2(Math.sin(target.ry - root.rotation.y), Math.cos(target.ry - root.rotation.y));
        root.rotation.y += turn * blend;
        plate.update(dt);
        entry.halo.update(dt);
        entry.pulse = Math.max(0, entry.pulse - dt);
        if (!root.visible || !avatar) continue;
        avatar.update(dt, { moving: target.moving, sitting: target.sitting });
        avatar.group.scale.setScalar(pulseScale(entry.pulse));
      }
    }
  };
}
