const test = require('node:test'), assert = require('node:assert/strict');
const { T } = require('./util.js');

const M = 600000;
test('starts with 5 lives, level 1 and 2 of each help', () => {
  assert.deepEqual(T.newSave().helps, { slot: 2, shuffle: 2, any: 2 });
  assert.equal(T.newSave().lives, 5);
});
test('one life back every 10 minutes, capped at 5', () => {
  const s = T.newSave();
  T.loseLife(s, 0); T.loseLife(s, 0);
  assert.deepEqual(T.livesNow(s, M - 1), { lives: 3, nextMs: 1 });
  assert.equal(T.livesNow(s, M).lives, 4);
  assert.equal(T.livesNow(s, 99 * M).lives, 5);
  assert.equal(T.livesNow(s, 99 * M).nextMs, 0);
});
test('0 lives blocks playing', () => {
  const s = T.newSave();
  for (let i = 0; i < 5; i++) T.loseLife(s, 0);
  assert.equal(T.canPlay(s, 1), false);
  assert.equal(T.canPlay(s, M), true);
});
test('clock going backwards gives no lives', () => {
  const s = T.newSave(); T.loseLife(s, 10 * M);
  assert.equal(T.livesNow(s, 0).lives, 4);
  assert.equal(T.livesNow(s, M).lives, 5);
});
test('+1 of each help every 50 levels', () => {
  const s = T.newSave(); s.level = 50;
  T.winLevel(s, 50);
  assert.equal(s.level, 51);
  assert.deepEqual(s.helps, { slot: 3, shuffle: 3, any: 3 });
  T.winLevel(s, 51);
  assert.deepEqual(s.helps, { slot: 3, shuffle: 3, any: 3 });
});
test('spending a help with none left fails', () => {
  const s = T.newSave(); s.helps.any = 0;
  assert.equal(T.spendHelp(s, 'any'), false);
  assert.equal(T.spendHelp(s, 'slot'), true); assert.equal(s.helps.slot, 1);
});
test('parseSave falls back', () => {
  assert.deepEqual(T.parseSave('lixo'), T.newSave());
  assert.deepEqual(T.parseSave('{"v":0}'), T.newSave());
  assert.equal(T.parseSave(JSON.stringify({ ...T.newSave(), level: 7 })).level, 7);
});
test('replaying a 50th level gives no help bonus', () => {
  const s = T.newSave(); s.level = 51;
  T.winLevel(s, 50);
  assert.equal(s.level, 51);
  assert.deepEqual(s.helps, { slot: 2, shuffle: 2, any: 2 });
});
