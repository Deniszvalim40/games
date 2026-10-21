const test = require('node:test'), assert = require('node:assert/strict');
const { T } = require('./util.js');

test('Recruta is always open; each difficulty needs the previous one beaten on that map', () => {
  assert.equal(T.diffUnlocked([], 'campo', 'recruta'), true);
  assert.equal(T.diffUnlocked([], 'campo', 'soldado'), false);
  assert.equal(T.diffUnlocked(['campo:recruta'], 'campo', 'soldado'), true);
  assert.equal(T.diffUnlocked(['campo:recruta'], 'campo', 'veterano'), false);
  assert.equal(T.diffUnlocked(['lama:recruta'], 'campo', 'soldado'), false);
  assert.equal(T.diffUnlocked(['campo:recruta', 'campo:soldado', 'campo:veterano'], 'campo', 'general'), true);
});
