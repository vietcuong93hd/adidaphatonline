// Đổi dương lịch sang âm lịch Việt Nam theo thuật toán thiên văn của Hồ Ngọc Đức, múi giờ UTC+7
const TIME_ZONE = 7;
const DEGREE = Math.PI / 180;
const SYNODIC_MONTH = 29.530588853;
const LUNATION_ZERO = 2415021.076998695;

const CAN = ['Giáp', 'Ất', 'Bính', 'Đinh', 'Mậu', 'Kỷ', 'Canh', 'Tân', 'Nhâm', 'Quý'];
const CHI = ['Tý', 'Sửu', 'Dần', 'Mão', 'Thìn', 'Tỵ', 'Ngọ', 'Mùi', 'Thân', 'Dậu', 'Tuất', 'Hợi'];

// Ngày âm lịch, khóa là tháng/ngày
const HOLY_DAYS = {
  '1/15': 'Rằm tháng Giêng',
  '2/19': 'Vía Quán Thế Âm đản sanh',
  '4/15': 'Lễ Phật Đản',
  '6/19': 'Vía Quán Thế Âm thành đạo',
  '7/15': 'Lễ Vu Lan',
  '9/19': 'Vía Quán Thế Âm xuất gia',
  '10/15': 'Rằm tháng Mười',
  '11/17': 'Vía Phật A Di Đà',
  '12/8': 'Phật thành đạo'
};

const { floor, sin, PI } = Math;

function julianDay(day, month, year) {
  const a = floor((14 - month) / 12);
  const y = year + 4800 - a;
  const m = month + 12 * a - 3;
  return day + floor((153 * m + 2) / 5) + 365 * y + floor(y / 4) - floor(y / 100) + floor(y / 400) - 32045;
}

function newMoonDay(k) {
  const T = k / 1236.85;
  const T2 = T * T;
  const T3 = T2 * T;
  const M = 359.2242 + 29.10535608 * k - 0.0000333 * T2 - 0.00000347 * T3;
  const Mpr = 306.0253 + 385.81691806 * k + 0.0107306 * T2 + 0.00001236 * T3;
  const F = 21.2964 + 390.67050646 * k - 0.0016528 * T2 - 0.00000239 * T3;
  const mean = 2415020.75933 + 29.53058868 * k + 0.0001178 * T2 - 0.000000155 * T3
    + 0.00033 * sin((166.56 + 132.87 * T - 0.009173 * T2) * DEGREE);
  const correction = (0.1734 - 0.000393 * T) * sin(M * DEGREE) + 0.0021 * sin(2 * DEGREE * M)
    - 0.4068 * sin(Mpr * DEGREE) + 0.0161 * sin(DEGREE * 2 * Mpr)
    - 0.0004 * sin(DEGREE * 3 * Mpr)
    + 0.0104 * sin(DEGREE * 2 * F) - 0.0051 * sin(DEGREE * (M + Mpr))
    - 0.0074 * sin(DEGREE * (M - Mpr)) + 0.0004 * sin(DEGREE * (2 * F + M))
    - 0.0004 * sin(DEGREE * (2 * F - M)) - 0.0006 * sin(DEGREE * (2 * F + Mpr))
    + 0.001 * sin(DEGREE * (2 * F - Mpr)) + 0.0005 * sin(DEGREE * (2 * Mpr + M));
  const delta = T < -11
    ? 0.001 + 0.000839 * T + 0.0002261 * T2 - 0.00000845 * T3 - 0.000000081 * T * T3
    : -0.000278 + 0.000265 * T + 0.000262 * T2;
  return floor(mean + correction - delta + 0.5 + TIME_ZONE / 24);
}

function sunSector(jd) {
  const T = (jd - 2451545.5 - TIME_ZONE / 24) / 36525;
  const T2 = T * T;
  const M = 357.5291 + 35999.0503 * T - 0.0001559 * T2 - 0.00000048 * T * T2;
  const L0 = 280.46645 + 36000.76983 * T + 0.0003032 * T2;
  const DL = (1.9146 - 0.004817 * T - 0.000014 * T2) * sin(DEGREE * M)
    + (0.019993 - 0.000101 * T) * sin(DEGREE * 2 * M) + 0.00029 * sin(DEGREE * 3 * M);
  const longitude = (L0 + DL) * DEGREE;
  return floor(((longitude - PI * 2 * floor(longitude / (PI * 2))) / PI) * 6);
}

// Ngày đầu tháng 11 âm, tháng luôn chứa đông chí
function month11Start(year) {
  const k = floor((julianDay(31, 12, year) - 2415021) / SYNODIC_MONTH);
  const moon = newMoonDay(k);
  return sunSector(moon) >= 9 ? newMoonDay(k - 1) : moon;
}

function leapMonthOffset(start) {
  const k = floor((start - LUNATION_ZERO) / SYNODIC_MONTH + 0.5);
  let index = 1;
  let sector = sunSector(newMoonDay(k + index));
  let last;
  do {
    last = sector;
    index += 1;
    sector = sunSector(newMoonDay(k + index));
  } while (sector !== last && index < 14);
  return index - 1;
}

export function toLunar(day, month, year) {
  const jd = julianDay(day, month, year);
  const k = floor((jd - LUNATION_ZERO) / SYNODIC_MONTH);
  let monthStart = newMoonDay(k + 1);
  if (monthStart > jd) monthStart = newMoonDay(k);

  let a11 = month11Start(year);
  let b11 = a11;
  let lunarYear = year;
  if (a11 >= monthStart) {
    a11 = month11Start(year - 1);
  } else {
    lunarYear = year + 1;
    b11 = month11Start(year + 1);
  }

  const diff = floor((monthStart - a11) / 29);
  let lunarMonth = diff + 11;
  let leap = false;
  if (b11 - a11 > 365) {
    const leapDiff = leapMonthOffset(a11);
    if (diff >= leapDiff) {
      lunarMonth = diff + 10;
      leap = diff === leapDiff;
    }
  }
  if (lunarMonth > 12) lunarMonth -= 12;
  if (lunarMonth >= 11 && diff < 4) lunarYear -= 1;
  return { day: jd - monthStart + 1, month: lunarMonth, year: lunarYear, leap, jd };
}

export const yearName = (year) => `${CAN[(year + 6) % 10]} ${CHI[(year + 8) % 12]}`;
export const dayName = (jd) => `${CAN[(jd + 9) % 10]} ${CHI[(jd + 1) % 12]}`;

export function holyDay({ day, month, leap }) {
  if (leap) return null;
  return HOLY_DAYS[`${month}/${day}`] ?? (day === 1 ? 'Mùng một' : day === 15 ? 'Ngày rằm' : null);
}
