// Pix estático (BR Code / EMV) — monta o copia e cola. Funções puras, testadas em ranking/test.
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.Pix = factory();
})(typeof self !== 'undefined' ? self : this, function () {

// CRC16-CCITT-FALSE (polinômio 0x1021, início 0xFFFF), como pede o BR Code.
function crc16(s) {
  let c = 0xFFFF;
  for (let i = 0; i < s.length; i++) {
    c ^= s.charCodeAt(i) << 8;
    for (let k = 0; k < 8; k++) c = c & 0x8000 ? (c << 1) ^ 0x1021 : c << 1;
    c &= 0xFFFF;
  }
  return c.toString(16).toUpperCase().padStart(4, '0');
}

const tlv = (id, v) => id + String(v.length).padStart(2, '0') + v;
const ascii = s => String(s).normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^\x20-\x7E]/g, '').toUpperCase().trim();

function brCode({ key, name, city, amount, txid }) {
  const tx = String(txid || '').toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 25) || '***';
  const body = tlv('00', '01')
    + tlv('26', tlv('00', 'br.gov.bcb.pix') + tlv('01', key))
    + tlv('52', '0000') + tlv('53', '986') + tlv('54', Number(amount).toFixed(2))
    + tlv('58', 'BR') + tlv('59', ascii(name).slice(0, 25)) + tlv('60', ascii(city).slice(0, 15))
    + tlv('62', tlv('05', tx)) + '6304';
  return body + crc16(body);
}

// "2,50", "R$ 10,00", "1.234,56" → número; menos de R$ 1 ou inválido → null.
function parseValor(t) {
  let s = String(t).replace(/[^\d.,]/g, '');
  if (s.includes(',')) s = s.replace(/\./g, '').replace(',', '.');
  const v = Math.round(parseFloat(s) * 100) / 100;
  return isFinite(v) && v >= 1 ? v : null;
}

const CODE_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
function makeCode(prefix, rnd = Math.random) {
  let c = prefix;
  for (let i = 0; i < 6; i++) c += CODE_CHARS[Math.floor(rnd() * CODE_CHARS.length)];
  return c;
}

const cleanName = s => String(s).replace(/[\u0000-\u001f\u007f]/g, '').replace(/\s+/g, ' ').trim().slice(0, 16);

return { crc16, brCode, parseValor, makeCode, cleanName };
});
