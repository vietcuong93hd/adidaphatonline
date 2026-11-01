// Phải khớp WALK_RECTS trong lib/gameRoom.js: chánh điện, cửa chính, sân chùa
const WALK_RECTS = [
  { minX: -18, maxX: 18, minZ: -14.5, maxZ: 21 },
  { minX: -3.5, maxX: 3.5, minZ: 21, maxZ: 30 },
  { minX: -58, maxX: 58, minZ: 30, maxZ: 106 }
];

export const HALL_FRONT_Z = 24;

export const isWalkable = (x, z) => WALK_RECTS.some((r) => x >= r.minX && x <= r.maxX && z >= r.minZ && z <= r.maxZ);
