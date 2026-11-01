const test = require('node:test');
const assert = require('node:assert');

const load = () => import('../public/js/game/lunar.js');

test('mùng một Tết các năm đúng lịch Việt Nam', async () => {
  const { toLunar, yearName } = await load();
  for (const [day, month, year, name] of [[10, 2, 2024, 'Giáp Thìn'], [29, 1, 2025, 'Ất Tỵ'], [17, 2, 2026, 'Bính Ngọ'], [6, 2, 2027, 'Đinh Mùi']]) {
    const lunar = toLunar(day, month, year);
    assert.deepStrictEqual([lunar.day, lunar.month, lunar.year, lunar.leap], [1, 1, year, false]);
    assert.strictEqual(yearName(lunar.year), name);
  }
});

test('Tết Việt Nam 2007 lệch một ngày so với lịch Trung Quốc', async () => {
  const { toLunar } = await load();
  assert.strictEqual(toLunar(17, 2, 2007).day, 1);
});

test('tháng nhuận được nhận ra', async () => {
  const { toLunar } = await load();
  const nhuan6 = toLunar(25, 7, 2025);
  assert.deepStrictEqual([nhuan6.day, nhuan6.month, nhuan6.leap], [1, 6, true]);
  const nhuan2 = toLunar(22, 3, 2023);
  assert.deepStrictEqual([nhuan2.day, nhuan2.month, nhuan2.leap], [1, 2, true]);
  assert.strictEqual(toLunar(24, 7, 2025).leap, false);
});

test('ngày vía và rằm', async () => {
  const { toLunar, holyDay } = await load();
  assert.strictEqual(holyDay(toLunar(27, 8, 2026)), 'Lễ Vu Lan');
  assert.strictEqual(holyDay({ day: 15, month: 3, leap: false }), 'Ngày rằm');
  assert.strictEqual(holyDay({ day: 1, month: 8, leap: false }), 'Mùng một');
  assert.strictEqual(holyDay({ day: 15, month: 6, leap: true }), null);
  assert.strictEqual(holyDay({ day: 2, month: 3, leap: false }), null);
});

test('can chi ngày', async () => {
  const { toLunar, dayName } = await load();
  assert.strictEqual(dayName(toLunar(29, 1, 2025).jd), 'Mậu Tuất');
  // Sau 384 ngày, tức tiến 24 bước trong vòng 60 can chi
  assert.strictEqual(dayName(toLunar(17, 2, 2026).jd), 'Nhâm Tuất');
});
