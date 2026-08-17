// Download Node.js v24.18.0 win-x64 portable and extract into runtime\node
// Uses node's own fetch (PowerShell Invoke-WebRequest is blocked in some sandboxes).
import { createWriteStream, existsSync, mkdirSync } from 'node:fs';
import { pipeline } from 'node:stream/promises';
import { Readable } from 'node:stream';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const version = 'v24.18.0';
const url = `https://nodejs.org/dist/${version}/node-${version}-win-x64.zip`;
const buildDir = join(root, 'build');
const zipPath = join(buildDir, `node-${version}-win-x64.zip`);
const runtimeDir = join(root, 'runtime');

mkdirSync(buildDir, { recursive: true });

if (!existsSync(zipPath)) {
  console.log(`Downloading ${url} ...`);
  const res = await fetch(url, { signal: AbortSignal.timeout(600000) });
  if (!res.ok) throw new Error(`download failed: ${res.status} ${res.statusText}`);
  await pipeline(Readable.fromWeb(res.body), createWriteStream(zipPath));
  console.log(`Downloaded ${(existsSync(zipPath) ? (await import('node:fs')).statSync(zipPath).size / 1048576 : 0).toFixed(0)} MB`);
} else {
  console.log('zip already present, skipping download');
}

// Extract with PowerShell Expand-Archive (or tar which ships with Windows 10+)
const extractDir = join(runtimeDir, `node-${version}-win-x64`);
if (!existsSync(join(extractDir, 'node.exe'))) {
  console.log('Extracting...');
  const r = spawnSync('tar', ['-xf', zipPath, '-C', runtimeDir], { stdio: 'inherit' });
  if (r.status !== 0) throw new Error(`tar extract failed: ${r.status}`);
}
const finalDir = join(runtimeDir, 'node');
if (existsSync(extractDir) && !existsSync(finalDir)) {
  const fs = await import('node:fs');
  fs.renameSync(extractDir, finalDir);
}
const nodeExe = join(finalDir, 'node.exe');
if (!existsSync(nodeExe)) throw new Error('node.exe missing after extract');
const v = spawnSync(nodeExe, ['-v'], { encoding: 'utf8' });
console.log(`Bundled node ready: ${finalDir} -> ${v.stdout.trim()}`);
