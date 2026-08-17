// Generate the DeepSeek Harness gray-whale icon: PNG (512/256) + multi-size ICO.
// Source: the official whale favicon.svg shipped inside dsh-web-frontend.
// The whale is rendered in gray on a transparent background.
import { readFileSync, writeFileSync, mkdirSync, statSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const assetsDir = join(root, 'assets');
mkdirSync(assetsDir, { recursive: true });

// sharp lives inside the bundled dsh node_modules
const sharpPath = join(root, 'runtime', 'dsh', 'node_modules', 'sharp', 'dist', 'index.cjs');
const { default: sharp } = await import(pathToFileURL(sharpPath).href);

const svgSrc = join(root, 'runtime', 'dsh', 'node_modules', '@deepseek-ai', 'dsh-web-frontend', 'dist', 'favicon.svg');
let svg = readFileSync(svgSrc, 'utf8');

// Strip the dark-mode media query so the icon has ONE fixed color.
svg = svg.replace(/<style>[\s\S]*?<\/style>/g, '');
// Gray whale: replace every fill with the gray tone.
svg = svg.replace(/fill="#000"/g, 'fill="#6E7A8C"');
svg = svg.replace(/fill="#fff"/g, 'fill="#6E7A8C"');

writeFileSync(join(assetsDir, 'whale.svg'), svg, 'utf8');

// Rasterize the 50x50 viewBox at high density so 512 px is crisp.
const SIZES = [16, 32, 48, 64, 128, 256, 512];
const density = Math.ceil((512 / 50) * 72); // ~737 DPI for 512px output
const base = sharp(Buffer.from(svg), { density }).png();

const pngs = {};
for (const size of SIZES) {
  pngs[size] = await base.clone().resize(size, size).png().toBuffer();
}

writeFileSync(join(assetsDir, 'whale.png'), pngs[512], 'utf8');
writeFileSync(join(assetsDir, 'whale-256.png'), pngs[256], 'utf8');

// ---- Build a Windows .ico with PNG-compressed entries (16..256) ----
const icoSizes = [16, 32, 48, 64, 128, 256];
const entries = [];
let offset = 6 + 16 * icoSizes.length;
for (const size of icoSizes) {
  const data = pngs[size];
  entries.push({
    size,
    data,
    offset,
    bytes: data.length,
  });
  offset += data.length;
}

const header = Buffer.alloc(6);
header.writeUInt16LE(0, 0);      // reserved
header.writeUInt16LE(1, 2);      // type: icon
header.writeUInt16LE(icoSizes.length, 4);

const dirBuf = Buffer.alloc(16 * icoSizes.length);
entries.forEach((e, i) => {
  const b = 16 * i;
  dirBuf.writeUInt8(e.size === 256 ? 0 : e.size, b);      // width (0 = 256)
  dirBuf.writeUInt8(e.size === 256 ? 0 : e.size, b + 1);  // height
  dirBuf.writeUInt8(0, b + 2);                            // palette
  dirBuf.writeUInt8(0, b + 3);                            // reserved
  dirBuf.writeUInt16LE(1, b + 4);                         // planes
  dirBuf.writeUInt16LE(32, b + 6);                        // bpp
  dirBuf.writeUInt32LE(e.bytes, b + 8);                   // size
  dirBuf.writeUInt32LE(e.offset, b + 12);                 // offset
});

const ico = Buffer.concat([header, dirBuf, ...entries.map((e) => e.data)]);
writeFileSync(join(assetsDir, 'whale.ico'), ico);

console.log('Icon files written to', assetsDir);
for (const f of ['whale.svg', 'whale.png', 'whale-256.png', 'whale.ico']) {
  console.log(`  ${f}: ${(await import('node:fs')).statSync(join(assetsDir, f)).size} bytes`);
}
