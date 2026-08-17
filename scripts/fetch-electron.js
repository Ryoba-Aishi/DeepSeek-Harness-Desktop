// Fetch Electron win32-x64 binary from npmmirror and lay it out the way
// node_modules/electron expects (dist/ + path.txt).
import { createWriteStream, mkdirSync, existsSync, writeFileSync, rmSync } from 'node:fs';
import { pipeline } from 'node:stream/promises';
import { Readable } from 'node:stream';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const version = '43.4.0';
const url = `https://npmmirror.com/mirrors/electron/v${version}/electron-v${version}-win32-x64.zip`;
const buildDir = join(root, 'build');
const zipPath = join(buildDir, `electron-v${version}-win32-x64.zip`);
const distDir = join(root, 'launcher', 'node_modules', 'electron', 'dist');

mkdirSync(buildDir, { recursive: true });

if (!existsSync(zipPath)) {
  console.log(`Downloading ${url}`);
  const res = await fetch(url, { signal: AbortSignal.timeout(600000) });
  if (!res.ok) throw new Error(`download failed: ${res.status}`);
  await pipeline(Readable.fromWeb(res.body), createWriteStream(zipPath));
  console.log('Downloaded electron zip');
} else {
  console.log('zip already present');
}

if (!existsSync(join(distDir, 'electron.exe'))) {
  rmSync(distDir, { recursive: true, force: true });
  mkdirSync(distDir, { recursive: true });
  console.log('Extracting...');
  const r = spawnSync('tar', ['-xf', zipPath, '-C', distDir], { stdio: 'inherit' });
  if (r.status !== 0) throw new Error(`tar extract failed: ${r.status}`);
}
if (!existsSync(join(distDir, 'electron.exe'))) throw new Error('electron.exe missing after extract');
writeFileSync(join(root, 'launcher', 'node_modules', 'electron', 'path.txt'), 'electron.exe');
console.log('Electron binary ready at', join(distDir, 'electron.exe'));
