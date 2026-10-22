// Gera os ícones PNG (trincheira ou vagalumia) sem dependências: node tools/make-icons.mjs trincheira
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
function drawTrincheira(size, inset) {
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


// Vagalumia: mascote (cabeça roxa sorrindo, antenas, asas, abdômen brilhante) sobre #070b16.
// Coordenadas do SVG do mascote (viewBox 160x150), amostradas 3x3 por pixel.
function drawVagalumia(size, inset) {
  const px = Buffer.alloc(size * size * 4);
  const bg = hex('#070b16');
  const mix = (c, r, a) => [c[0] + (r[0] - c[0]) * a, c[1] + (r[1] - c[1]) * a, c[2] + (r[2] - c[2]) * a];
  const ell = (x, y, cx, cy, rx, ry) => ((x - cx) / rx) ** 2 + ((y - cy) / ry) ** 2;
  const rot = (x, y, cx, cy, deg) => {
    const a = -deg * Math.PI / 180, dx = x - cx, dy = y - cy;
    return [cx + dx * Math.cos(a) - dy * Math.sin(a), cy + dx * Math.sin(a) + dy * Math.cos(a)];
  };
  const seg = (x, y, ax, ay, bx, by) => {
    const dx = bx - ax, dy = by - ay, t = Math.max(0, Math.min(1, ((x - ax) * dx + (y - ay) * dy) / (dx * dx + dy * dy)));
    return Math.hypot(x - ax - t * dx, y - ay - t * dy);
  };
  const shade = (x, y) => {
    let c = bg;
    const g = ell(x, y, 80, 114, 52, 44); // brilho
    if (g < 1) c = mix(c, hex('#ffee00'), 0.5 * (1 - g) ** 1.5);
    // antenas
    for (const [ax, ay, mx, my, bx, by] of [[70, 42, 64, 24, 56, 16], [90, 42, 96, 24, 104, 16]]) {
      const d = Math.min(seg(x, y, ax, ay, mx, my), seg(x, y, mx, my, bx, by));
      if (d < 2.4) c = hex('#8a78d0');
    }
    for (const tx of [56, 104]) if (Math.hypot(x - tx, y - 15) < 5.5) c = hex('#ffee00');
    // asas
    for (const [cx, deg] of [[44, -25], [116, 25]]) {
      const [rx, ry] = rot(x, y, cx, 58, deg), e = ell(rx, ry, cx, 58, 28, 16);
      if (e < 1) c = mix(c, hex('#d8ecff'), 0.4);
      if (e > 0.86 && e < 1.06) c = mix(c, hex('#ffffff'), 0.6);
    }
    // abdômen
    const ab = ell(x, y, 80, 112, 26, 24);
    if (ab < 1) c = mix(hex('#ffc400'), hex('#fffbd0'), Math.max(0, 1 - Math.hypot((x - 80) / 26, (y - 106) / 24) * 1.1) ** 1.2 * 0.9 + 0.1);
    if (ab < 1 && ab > 0.8) c = mix(c, hex('#ffc400'), 0.5);
    // cabeça
    const hd = Math.hypot(x - 80, y - 68) / 32;
    if (hd < 1.06) c = hd > 0.96 ? hex('#1c1538') : mix(hex('#6a58a8'), hex('#2e2356'), Math.min(1, Math.hypot(x - 72, y - 56) / 42));
    if (hd < 0.96) {
      for (const ex of [69, 91]) {
        if (ell(x, y, ex, 64, 6.5, 7.5) < 1) c = hex('#ffffff');
        if (Math.hypot(x - ex - 1, y - 65.5) < 3.8) c = hex('#1a1230');
        if (Math.hypot(x - ex - 2.4, y - 63.8) < 1.4) c = hex('#ffffff');
      }
      for (const cx of [60, 100]) if (ell(x, y, cx, 77, 5.5, 3.5) < 1) c = mix(c, hex('#ff7aa8'), 0.75);
      // sorriso: parábola y = 78 + 10*(1 - ((x-80)/9)^2)... aproximada por curva quadrática
      if (x > 70 && x < 90) { const t = (x - 71) / 18, sy = 78 + 20 * t * (1 - t) * 1; if (Math.abs(y - sy) < 1.6) c = hex('#ffffff'); }
    }
    return c;
  };
  const N = 3;
  for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
    let r = 0, g = 0, b = 0;
    for (let sy = 0; sy < N; sy++) for (let sx = 0; sx < N; sx++) {
      const u = ((x + (sx + 0.5) / N) / size - inset) / (1 - 2 * inset), v = ((y + (sy + 0.5) / N) / size - inset) / (1 - 2 * inset);
      const c = shade(80 + (u - 0.5) * 152, 80 + (v - 0.5) * 152);
      r += c[0]; g += c[1]; b += c[2];
    }
    const i = (y * size + x) * 4, n = N * N;
    px[i] = Math.round(r / n); px[i + 1] = Math.round(g / n); px[i + 2] = Math.round(b / n); px[i + 3] = 255;
  }
  return png(size, px);
}

const draw = dir === 'vagalumia' ? drawVagalumia : drawTrincheira;

writeFileSync(join(dir, 'icon-192.png'), draw(192, 0.04));
writeFileSync(join(dir, 'icon-512.png'), draw(512, 0.04));
writeFileSync(join(dir, 'icon-maskable-512.png'), draw(512, 0.14));
console.log('ícones gravados em', dir);
