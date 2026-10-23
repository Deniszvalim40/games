const test = require('node:test');
const assert = require('node:assert');
const P = require('../pix.js');

test('crc16 bate com o valor de referência CCITT-FALSE', () => {
  assert.strictEqual(P.crc16('123456789'), '29B1');
});

test('BR Code do exemplo do manual do Banco Central', () => {
  const body = '00020126580014br.gov.bcb.pix0136123e4567-e12b-12d1-a456-4266554400005204000053039865802BR5913Fulano de Tal6008BRASILIA62070503***6304';
  assert.strictEqual(P.crc16(body), '1D3D');
});

test('brCode monta os campos na ordem e fecha com CRC', () => {
  const s = P.brCode({ key: 'kurtgv@outlook.com', name: 'Ranking Games', city: 'Brasil', amount: 1, txid: 'VG7K2QXM' });
  assert.ok(s.startsWith('000201'));
  assert.ok(s.includes('0014br.gov.bcb.pix0118kurtgv@outlook.com'));
  assert.ok(s.includes('52040000530398654041.005802BR5913RANKING GAMES6006BRASIL'));
  assert.ok(s.includes('62120508VG7K2QXM'));
  assert.ok(/6304[0-9A-F]{4}$/.test(s));
  assert.strictEqual(P.crc16(s.slice(0, -4)), s.slice(-4));
});

test('brCode tira acentos, corta nome e cidade e formata o valor', () => {
  const s = P.brCode({ key: 'a@b.co', name: 'José da Conceição Aparecida Silva', city: 'São José dos Campos', amount: 12.5, txid: 'X' });
  assert.ok(s.includes('540512.50'));
  assert.ok(s.includes('5925JOSE DA CONCEICAO APARECI60'));
  assert.ok(s.includes('6015SAO JOSE DOS CA'));
});

test('txid só com letras e números, até 25', () => {
  const s = P.brCode({ key: 'a@b.co', name: 'A', city: 'B', amount: 1, txid: 'ab-c_12*' + 'Z'.repeat(40) });
  const m = s.match(/62(\d\d)05(\d\d)([A-Z0-9]+)6304/);
  assert.ok(m);
  assert.strictEqual(m[3].length, 25);
  assert.ok(m[3].startsWith('ABC12'));
});

test('parseValor aceita vírgula e recusa menos de 1 real', () => {
  assert.strictEqual(P.parseValor('1'), 1);
  assert.strictEqual(P.parseValor('2,50'), 2.5);
  assert.strictEqual(P.parseValor('R$ 10,00'), 10);
  assert.strictEqual(P.parseValor('0,99'), null);
  assert.strictEqual(P.parseValor('abc'), null);
  assert.strictEqual(P.parseValor('1.234,56'), 1234.56);
});

test('makeCode gera prefixo + 6 caracteres sem ambíguos', () => {
  let i = 0; const rnd = () => (i++ % 7) / 7;
  const c = P.makeCode('VG', rnd);
  assert.match(c, /^VG[A-Z2-9]{6}$/);
  assert.ok(!/[O0I1]/.test(c.slice(2)));
});

test('cleanName limpa espaços e caracteres de controle', () => {
  assert.strictEqual(P.cleanName('  Ana   Maria \u0007 '), 'Ana Maria');
  assert.strictEqual(P.cleanName('x'.repeat(30)).length, 16);
  assert.strictEqual(P.cleanName('   '), '');
});
