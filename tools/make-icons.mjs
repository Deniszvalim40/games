// Gera os ícones PNG do Trincheira sem dependências: node tools/make-icons.mjs trincheira
import { deflateSync } from 'node:zlib';
import { writeFileSync } from 'node:fs';
import { join } from 'node:path';

const dir = process.argv[2] || 'trincheira';

const CRC = new Uint32Array(256).map((_, n) => {
  let c = n;
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  return c >>> 0;
});
function crc32(buf) {
  let c = 0xffffffff;
  for (const b of buf) c = CRC[(c ^ b) & 255] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}
function chunk(type, data) {
  const len = Buffer.alloc(4), crc = Buffer.alloc(4), td = Buffer.concat([Buffer.from(type), data]);
  len.writeUInt32BE(data.length); crc.writeUInt32BE(crc32(td));
  return Buffer.concat([len, td, crc]);
}
function png(size, px) {
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0); ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8; ihdr[9] = 6; // 8 bits, RGBA
  const raw = Buffer.alloc((size * 4 + 1) * size);
  for (let y = 0; y < size; y++) px.copy(raw, y * (size * 4 + 1) + 1, y * size * 4, (y + 1) * size * 4);
  return Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    chunk('IHDR', ihdr), chunk('IDAT', deflateSync(raw)), chunk('IEND', Buffer.alloc(0))]);
}
const hex = h => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];

// Desenho em coordenadas 0..1 dentro da área útil (inset = margem para o maskable).
function draw(size, inset) {
  const px = Buffer.alloc(size * size * 4);
  const bg = hex('#0d1410'), dirt = hex('#6b5235'), ditch = hex('#2e2219'),
    sand = hex('#b9a479'), helm = hex('#5f7a2e'), helmDark = hex('#3e5220');
  for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
    const u = (x / size - inset) / (1 - 2 * inset), v = (y / size - inset) / (1 - 2 * inset);
    let c = bg;
    if (v > 0.62) c = dirt;
    if (v > 0.66 && v < 0.84 && Math.abs(u - 0.5) < 0.3 - (v - 0.66) * 0.4) c = ditch;
    if (v > 0.56 && v < 0.64 && Math.abs(u - 0.5) < 0.38 && Math.floor(u * 10) % 2 === 0) c = sand;
    if (v > 0.56 && v < 0.64 && Math.abs(u - 0.5) < 0.38 && Math.floor(u * 10) % 2 === 1) c = hex('#a8936a');
    const dx = (u - 0.5) / 0.3, dy = (v - 0.55) / 0.26; // capacete: meia elipse
    if (dy < 0 && dx * dx + dy * dy < 1) c = dy < -0.75 ? helmDark : helm;
    if (v > 0.53 && v < 0.57 && Math.abs(u - 0.5) < 0.36) c = helmDark; // aba
    const i = (y * size + x) * 4;
    px[i] = c[0]; px[i + 1] = c[1]; px[i + 2] = c[2]; px[i + 3] = 255;
  }
  return png(size, px);
}

writeFileSync(join(dir, 'icon-192.png'), draw(192, 0.04));
writeFileSync(join(dir, 'icon-512.png'), draw(512, 0.04));
writeFileSync(join(dir, 'icon-maskable-512.png'), draw(512, 0.14));
console.log('ícones gravados em', dir);
