const test = require('node:test');
const assert = require('node:assert');
const { buildEvent, parseComment } = require('../lib/rituals');

test('nhận đúng nghi thức từ bình luận', () => {
  assert.strictEqual(parseComment('Thắp hương').type, 'huong');
  assert.strictEqual(parseComment('thap huong cho me').type, 'huong');
  assert.strictEqual(parseComment('Nam mô A Di Đà Phật').type, 'niem');
  assert.strictEqual(parseComment('thả đèn').type, 'den');
  assert.deepStrictEqual(parseComment('Cầu gia đình bình an'), {
    type: 'den',
    wish: 'Cầu gia đình bình an'
  });
});

test('bỏ qua bình luận thường', () => {
  assert.strictEqual(parseComment('chào mọi người'), null);
  assert.strictEqual(parseComment('Nguyễn Văn An đây'), null);
  assert.strictEqual(parseComment('🙏🙏🙏'), null);
  assert.strictEqual(parseComment(''), null);
});

test('chặn từ phản cảm và liên kết nhưng không chặn nhầm', () => {
  assert.strictEqual(parseComment('cầu đm tất cả'), null);
  assert.strictEqual(parseComment('cầu xem shop.com nhé'), null);
  assert.strictEqual(parseComment('cầu các con lớn khôn').type, 'den');
});

test('giới hạn số lượng theo nghi thức', () => {
  assert.strictEqual(buildEvent({ type: 'niem', count: 9999 }).count, 108);
  assert.strictEqual(buildEvent({ type: 'huong', count: 50 }).count, 9);
  assert.strictEqual(buildEvent({ type: 'den', count: 5 }).count, 1);
  assert.strictEqual(buildEvent({ type: 'niem', count: -5 }).count, 1);
});

test('làm sạch tên và lời nguyện', () => {
  assert.strictEqual(buildEvent({ type: 'niem', user: '𝒯𝒽𝒶𝓃𝒽' }).user, 'Thanh');
  assert.strictEqual(buildEvent({ type: 'niem', user: 'đm' }).user, 'Một bạn');
  assert.strictEqual(buildEvent({ type: 'niem', user: '🙏' }).user, 'Một bạn');
  assert.strictEqual(buildEvent({ type: 'den', wish: 'cầu đm' }), null);
  assert.strictEqual(buildEvent({ type: 'den' }).wish, 'Cầu bình an');
});

test('từ chối loại nghi thức lạ', () => {
  assert.strictEqual(buildEvent({ type: 'xinxam' }), null);
  assert.strictEqual(buildEvent({ type: 'constructor' }), null);
});
