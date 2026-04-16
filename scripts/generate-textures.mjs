/**
 * generate-textures.mjs  (FIX 3 — organic farm textures)
 * Pure Node.js, no native deps. Uses built-in zlib.
 * Run: node scripts/generate-textures.mjs
 */
import { writeFileSync, mkdirSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import zlib from 'zlib';

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT = resolve(__dirname, '../public/textures');
mkdirSync(OUT, { recursive: true });

const W = 512, H = 512;

// ── PNG encoder (Node zlib) ──────────────────────────────────────────
const CRC = (() => {
  const t = new Uint32Array(256);
  for (let i = 0; i < 256; i++) {
    let c = i;
    for (let j = 0; j < 8; j++) c = (c & 1) ? (0xedb88320 ^ (c >>> 1)) : (c >>> 1);
    t[i] = c >>> 0;
  }
  return t;
})();

function crc32(buf) {
  let c = 0xffffffff;
  for (const b of buf) c = (CRC[(c ^ b) & 0xff] ^ (c >>> 8)) >>> 0;
  return (~c) >>> 0;
}

function pngChunk(type, data) {
  const tb = Buffer.from(type, 'ascii');
  const lb = Buffer.alloc(4); lb.writeUInt32BE(data.length);
  const cb = Buffer.alloc(4); cb.writeUInt32BE(crc32(Buffer.concat([tb, data])));
  return Buffer.concat([lb, tb, data, cb]);
}

function encodePNG(w, h, rgba) {
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(w, 0); ihdr.writeUInt32BE(h, 4);
  ihdr[8] = 8; ihdr[9] = 6;
  const rows = [];
  for (let y = 0; y < h; y++) {
    rows.push(0);
    for (let x = 0; x < w; x++) {
      const i = (y * w + x) * 4;
      rows.push(rgba[i], rgba[i+1], rgba[i+2], rgba[i+3]);
    }
  }
  return Buffer.concat([
    Buffer.from([137,80,78,71,13,10,26,10]),
    pngChunk('IHDR', ihdr),
    pngChunk('IDAT', zlib.deflateSync(Buffer.from(rows), { level: 6 })),
    pngChunk('IEND', Buffer.alloc(0)),
  ]);
}

// ── Fast LCG RNG ─────────────────────────────────────────────────────
function makeLCG(seed = 123456789) {
  let s = seed >>> 0;
  return () => { s = ((s * 1664525 + 1013904223) & 0xffffffff) >>> 0; return s / 0xffffffff; };
}

// ── Simple value noise (2D, 1 octave) ────────────────────────────────
function makeNoise2D(rng, gridSize = 32) {
  const cells = Math.ceil(W / gridSize + 2) * Math.ceil(H / gridSize + 2);
  const table = Float32Array.from({ length: cells }, () => rng());

  function grad(gx, gy) {
    const idx = ((gy & 0xff) * 512 + (gx & 0xff)) % table.length;
    return table[idx];
  }

  function smoothstep(t) { return t * t * (3 - 2 * t); }

  return (x, y) => {
    const ix = Math.floor(x / gridSize);
    const iy = Math.floor(y / gridSize);
    const fx = (x / gridSize) - ix;
    const fy = (y / gridSize) - iy;
    const sx = smoothstep(fx);
    const sy = smoothstep(fy);
    const a = grad(ix, iy);
    const b = grad(ix + 1, iy);
    const c = grad(ix, iy + 1);
    const d = grad(ix + 1, iy + 1);
    return a + (b - a) * sx + (c - a) * sy + (d - a + a - b - c + b + c - a - b + a - c + b + c - d + d - c - b + a) * sx * sy;
    // simplified: lerp in x then in y
  };
}

function lerp2D(rng, gridSize) {
  const gw = Math.ceil(W / gridSize) + 2;
  const gh = Math.ceil(H / gridSize) + 2;
  const grid = new Float32Array(gw * gh);
  for (let i = 0; i < grid.length; i++) grid[i] = rng();

  function smoothstep(t) { return t * t * (3 - 2 * t); }
  function getG(gx, gy) {
    gx = Math.max(0, Math.min(gw - 1, gx));
    gy = Math.max(0, Math.min(gh - 1, gy));
    return grid[gy * gw + gx];
  }

  return (px, py) => {
    const rx = px / gridSize;
    const ry = py / gridSize;
    const ix = Math.floor(rx), iy = Math.floor(ry);
    const fx = rx - ix, fy = ry - iy;
    const sx = smoothstep(fx), sy = smoothstep(fy);
    const a = getG(ix, iy), b = getG(ix + 1, iy);
    const c = getG(ix, iy + 1), d = getG(ix + 1, iy + 1);
    return a + (b - a) * sx + (c - a) * sy + (d - b - c + a) * sx * sy;
  };
}

// Layered fractal noise (4 octaves)
function fbm(noiseFn, rng, px, py, octaves = 4, persistence = 0.5, lacunarity = 2.0) {
  let val = 0, amp = 1, freq = 1, max = 0;
  for (let o = 0; o < octaves; o++) {
    val += noiseFn(px * freq, py * freq) * amp;
    max += amp;
    amp *= persistence;
    freq *= lacunarity;
  }
  return val / max;
}

// ── Pixel helpers ────────────────────────────────────────────────────
function makeBuf() { return new Uint8Array(W * H * 4); }

function setPixel(buf, x, y, r, g, b, a = 255) {
  if (x < 0 || x >= W || y < 0 || y >= H) return;
  const i = (y * W + x) * 4;
  const sa = a / 255, da = buf[i + 3] / 255;
  const oa = sa + da * (1 - sa);
  if (oa < 1e-5) return;
  buf[i]   = Math.round((r * sa + buf[i]   * da * (1 - sa)) / oa);
  buf[i+1] = Math.round((g * sa + buf[i+1] * da * (1 - sa)) / oa);
  buf[i+2] = Math.round((b * sa + buf[i+2] * da * (1 - sa)) / oa);
  buf[i+3] = Math.round(oa * 255);
}

function fillSolid(buf, r, g, b) {
  for (let i = 0; i < W * H * 4; i += 4) {
    buf[i] = r; buf[i+1] = g; buf[i+2] = b; buf[i+3] = 255;
  }
}

// ── Colour lerp ──────────────────────────────────────────────────────
function lerpC(a, b, t) {
  return [
    Math.round(a[0] + (b[0] - a[0]) * t),
    Math.round(a[1] + (b[1] - a[1]) * t),
    Math.round(a[2] + (b[2] - a[2]) * t),
  ];
}

function clamp(v, lo = 0, hi = 255) { return Math.max(lo, Math.min(hi, Math.round(v))); }


// ═══════════════════════════════════════════════
// 1. SATELLITE TEXTURE
// ═══════════════════════════════════════════════
{
  const rng  = makeLCG(0xdeadbeef);
  const n32  = lerp2D(makeLCG(111), 32);   // large field patches
  const n8   = lerp2D(makeLCG(222), 8);    // micro texture
  const n64  = lerp2D(makeLCG(333), 64);   // moisture variation
  const n16  = lerp2D(makeLCG(444), 16);   // stress patches

  const buf = makeBuf();

  // Colour palette
  const SOIL      = [74, 55, 40];
  const RICE_DEEP = [58, 110, 36];    // mature dark rice
  const RICE_MID  = [80, 148, 50];    // mid-growth
  const RICE_YOUN = [122, 181, 76];   // young/bright rice
  const STRESSED  = [168, 132, 60];   // dry/water-stressed
  const PATH      = [107, 82, 64];    // soil path
  const WATER     = [26, 74, 110];    // irrigation channel

  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const fx = x / W, fy = y / H;

      // Base: noise-driven field type
      const bigPatch = n32(x, y);   // 0..1 field zone
      const micro    = n8(x, y);    // fine texture
      const stress   = n16(x, y);   // stress areas
      const moisture = n64(x, y);   // moisture gradient

      // Row lines (rice paddies) — subtle horizontal stripe every 6px
      const rowLine = (y % 6 === 0) ? 0.92 : 1.0;

      // Field colour based on big patch zones
      let [r, g, b] = SOIL;
      if (bigPatch > 0.72) {
        [r, g, b] = lerpC(RICE_DEEP, RICE_MID, micro);
      } else if (bigPatch > 0.50) {
        [r, g, b] = lerpC(RICE_MID, RICE_YOUN, micro);
      } else if (bigPatch > 0.30) {
        [r, g, b] = lerpC(RICE_YOUN, STRESSED, stress);
      } else {
        [r, g, b] = lerpC(STRESSED, PATH, micro);
      }

      // Stress overlay in areas where n16 is high
      if (stress > 0.65 && bigPatch < 0.60) {
        const t = (stress - 0.65) / 0.35;
        [r, g, b] = lerpC([r, g, b], STRESSED, t * 0.6);
      }

      // Moisture darkens healthy areas
      if (bigPatch > 0.50) {
        const t = moisture * 0.25;
        r = clamp(r - t * 15);
        g = clamp(g - t * 10);
        b = clamp(b + t * 5);
      }

      // Row line dimming
      r = clamp(r * rowLine);
      g = clamp(g * rowLine);
      b = clamp(b * rowLine);

      // Fine micro-noise for realism
      const jitter = (micro - 0.5) * 18;
      r = clamp(r + jitter * 0.4);
      g = clamp(g + jitter * 0.5);
      b = clamp(b + jitter * 0.2);

      buf[(y * W + x) * 4]     = r;
      buf[(y * W + x) * 4 + 1] = g;
      buf[(y * W + x) * 4 + 2] = b;
      buf[(y * W + x) * 4 + 3] = 255;
    }
  }

  // ── Water channels ── draw on top as thin lines
  // Vertical channel
  for (let y = 0; y < H; y++) {
    for (let dx = -3; dx <= 3; dx++) {
      const cx = Math.round(W * 0.38 + Math.sin(y * 0.04) * 4) + dx;
      const alpha = Math.round(200 * (1 - Math.abs(dx) / 4));
      setPixel(buf, cx, y, WATER[0], WATER[1], WATER[2], alpha);
    }
  }
  // Horizontal channel
  for (let x = 0; x < W; x++) {
    for (let dy = -2; dy <= 2; dy++) {
      const cy = Math.round(H * 0.35 + Math.cos(x * 0.05) * 3) + dy;
      const alpha = Math.round(190 * (1 - Math.abs(dy) / 3));
      setPixel(buf, x, cy, WATER[0], WATER[1], WATER[2], alpha);
    }
  }
  // Diagonal feeder channel
  for (let t = 0; t < 1; t += 0.001) {
    const cx = Math.round(W * 0.62 + t * W * 0.25);
    const cy = Math.round(H * 0.1 + t * H * 0.5);
    for (let d = -2; d <= 2; d++) {
      const alpha = Math.round(150 * (1 - Math.abs(d) / 3));
      setPixel(buf, cx + d, cy, WATER[0], WATER[1], WATER[2], alpha);
    }
  }

  writeFileSync(`${OUT}/satellite.jpg`, encodePNG(W, H, buf));
  writeFileSync(`${OUT}/satellite.png`, encodePNG(W, H, buf));
  console.log('✓ satellite.jpg');
}


// ═══════════════════════════════════════════════
// 2. NDVI HEATMAP — smooth gradient zones
// ═══════════════════════════════════════════════
{
  const rng = makeLCG(0xcafebabe);
  const n48 = lerp2D(makeLCG(555), 48);   // zone shapes
  const n24 = lerp2D(makeLCG(666), 24);   // medium variation
  const n12 = lerp2D(makeLCG(777), 12);   // fine grain

  // NDVI colour map: 0=dead/water → 1=peak health
  // 0.0=dark blue (water), 0.2=dark red, 0.5=yellow, 0.7=lime, 1.0=bright green
  function ndviToRGB(v) {
    if (v < 0.05) return [0, 18, 128];          // water channel — dark blue
    if (v < 0.25) {
      const t = (v - 0.05) / 0.20;
      return lerpC([204, 0, 0], [255, 60, 0], t);   // disease dark red → orange-red
    }
    if (v < 0.50) {
      const t = (v - 0.25) / 0.25;
      return lerpC([255, 80, 0], [255, 204, 0], t);  // stress orange → yellow
    }
    if (v < 0.70) {
      const t = (v - 0.50) / 0.20;
      return lerpC([200, 220, 0], [60, 220, 20], t); // moderate → healthy green
    }
    // 0.70 → 1.0: peak health
    const t = (v - 0.70) / 0.30;
    return lerpC([40, 210, 20], [0, 224, 80], t);    // green → bright green
  }

  const buf = makeBuf();

  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const fx = x / W, fy = y / H;

      // Zone driver: smooth FBM to get 0..1 NDVI base
      const zone = n48(x, y);
      const fine = n24(x, y);
      const grain = n12(x, y);

      // Spatial bias: left edge stressed, centre healthy, top-right disease
      const leftStress  = Math.max(0, 1 - fx * 2.2);                     // 0..1 left
      const centerBoost = Math.exp(-((fx - 0.5) ** 2 + (fy - 0.45) ** 2) / 0.06);
      const topRightDis = Math.max(0, (fx - 0.65) * 3) * Math.max(0, (1 - fy * 2));
      const btmRightMod = Math.max(0, (fx - 0.55) * 2) * Math.max(0, fy - 0.55);

      let ndvi = zone * 0.5 + fine * 0.3 + grain * 0.2;  // base 0..1
      ndvi = ndvi * 0.6 + 0.2;                            // shift to 0.2..0.8 range
      ndvi += centerBoost * 0.5;                           // healthy center
      ndvi -= leftStress * 0.55;                           // left stress
      ndvi -= topRightDis * 0.65;                          // disease top-right
      ndvi = ndvi * 0.7 + btmRightMod * 0.25;             // moderate bottom-right blend

      ndvi = Math.max(0.08, Math.min(1, ndvi));

      // Water channels: force very low NDVI (dark blue)
      const vertChan  = Math.abs(x - Math.round(W * 0.38 + Math.sin(y * 0.04) * 4)) < 4;
      const horizChan = Math.abs(y - Math.round(H * 0.35 + Math.cos(x * 0.05) * 3)) < 3;
      if (vertChan || horizChan) ndvi = 0.02;

      const [r, g, b] = ndviToRGB(ndvi);
      const i = (y * W + x) * 4;
      buf[i] = r; buf[i+1] = g; buf[i+2] = b; buf[i+3] = 255;
    }
  }

  writeFileSync(`${OUT}/ndvi.png`, encodePNG(W, H, buf));
  console.log('✓ ndvi.png');
}


// ═══════════════════════════════════════════════
// 3. HEIGHTMAP — smooth greyscale elevation
// ═══════════════════════════════════════════════
{
  const n96 = lerp2D(makeLCG(888), 96);   // broad terrain shape
  const n48 = lerp2D(makeLCG(999), 48);   // medium hills
  const n24 = lerp2D(makeLCG(101), 24);   // small bumps
  const n12 = lerp2D(makeLCG(202), 12);   // micro terrain

  const buf = makeBuf();

  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const fx = x / W, fy = y / H;

      // Layered elevation
      const broad  = n96(x, y);  // 0..1
      const medium = n48(x, y);
      const small  = n24(x, y);
      const micro  = n12(x, y);

      // Compose: 4 octave FBM-like
      let elev = broad * 0.50 + medium * 0.28 + small * 0.14 + micro * 0.08;

      // Add spatial gradients for realistic terrain:
      // NW quadrant elevated
      const nwHill = Math.max(0, (1 - fx * 1.4) * (1 - fy * 1.4));
      elev += nwHill * 0.35;

      // SE corner lower ground
      const seDown = Math.max(0, (fx - 0.55) * 1.8) * Math.max(0, (fy - 0.55) * 1.8);
      elev -= seDown * 0.25;

      // NE-to-SW ridge
      const ridge = Math.exp(-((fx - fy + 0.1) ** 2) / 0.014);
      elev += ridge * 0.22;

      // Center-south depression (pond/hollow)
      const hollow = Math.exp(-((fx - 0.50) ** 2 + (fy - 0.72) ** 2) / 0.018);
      elev -= hollow * 0.30;

      elev = Math.max(0, Math.min(1, elev));

      // Scale to 60..230 (high contrast for visible displacement)
      const v = clamp(60 + elev * 170);

      const i = (y * W + x) * 4;
      buf[i] = v; buf[i+1] = v; buf[i+2] = v; buf[i+3] = 255;
    }
  }

  writeFileSync(`${OUT}/heightmap.png`, encodePNG(W, H, buf));
  console.log('✓ heightmap.png');
}

// ═══════════════════════════════════════════════
// 4. NDVI LAST MONTH — more stressed version for split-screen compare
// ═══════════════════════════════════════════════
{
  const n48 = lerp2D(makeLCG(1001), 48);
  const n24 = lerp2D(makeLCG(1002), 24);
  const n12 = lerp2D(makeLCG(1003), 12);

  function ndviToRGB(v) {
    if (v < 0.05) return [0, 18, 128];
    if (v < 0.25) { const t = (v-0.05)/0.20; return lerpC([204,0,0],[255,60,0],t); }
    if (v < 0.50) { const t = (v-0.25)/0.25; return lerpC([255,80,0],[255,204,0],t); }
    if (v < 0.70) { const t = (v-0.50)/0.20; return lerpC([200,220,0],[60,220,20],t); }
    const t = (v-0.70)/0.30;
    return lerpC([40,210,20],[0,224,80],t);
  }

  const buf = makeBuf();
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const fx = x/W, fy = y/H;
      const zone = n48(x,y), fine = n24(x,y), grain = n12(x,y);

      // 30 days ago: more stress (left & right edges), smaller healthy core
      const leftStress   = Math.max(0, 1 - fx * 1.6);
      const rightStress  = Math.max(0, (fx - 0.55) * 2.5);
      const centerBoost  = Math.exp(-((fx-0.48)**2 + (fy-0.42)**2) / 0.035); // smaller
      const topRightDis  = Math.max(0, (fx-0.58)*3.5) * Math.max(0, 1-fy*1.8);
      const btmLeftDis   = Math.max(0, 1-fx*2.0) * Math.max(0, fy-0.6);

      let ndvi = zone*0.5 + fine*0.3 + grain*0.2;
      ndvi = ndvi*0.5 + 0.15;
      ndvi += centerBoost * 0.45;
      ndvi -= leftStress  * 0.65;
      ndvi -= rightStress * 0.45;
      ndvi -= topRightDis * 0.75;
      ndvi -= btmLeftDis  * 0.55;
      ndvi = Math.max(0.08, Math.min(1, ndvi));

      const vertChan  = Math.abs(x - Math.round(W*0.38 + Math.sin(y*0.04)*4)) < 4;
      const horizChan = Math.abs(y - Math.round(H*0.35 + Math.cos(x*0.05)*3)) < 3;
      if (vertChan || horizChan) ndvi = 0.02;

      const [r,g,b] = ndviToRGB(ndvi);
      const i = (y*W+x)*4;
      buf[i]=r; buf[i+1]=g; buf[i+2]=b; buf[i+3]=255;
    }
  }
  writeFileSync(`${OUT}/ndvi_last_month.png`, encodePNG(W, H, buf));
  console.log('✓ ndvi_last_month.png');
}

console.log(`\nAll textures saved to ${OUT}`);

