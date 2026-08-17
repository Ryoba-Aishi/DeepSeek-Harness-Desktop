// DeepSeek Harness desktop launcher — main process.
// Starts the bundled dsh web server (self-contained Node runtime), waits for
// the port, and loads the Harness UI into an Electron window.
const { app, BrowserWindow, ipcMain, shell, dialog, Menu } = require('electron');
const { spawn } = require('child_process');
const http = require('http');
const net = require('net');
const fs = require('fs');
const os = require('os');
const path = require('path');

const APP_NAME = 'DeepSeek Harness';
const DEFAULT_PORT = 3080;
const BOOT_MARKER = '__DSH_BOOT__';
const POLL_INTERVAL_MS = 600;
const DEFAULT_TIMEOUT_MS = 120000;
const LOG_TAIL_BYTES = 8000;

app.setName(APP_NAME);

// ---------------------------------------------------------------- paths
const isPackaged = app.isPackaged;
const runtimeRoot = isPackaged
  ? path.join(process.resourcesPath, 'runtime')
  : path.join(__dirname, '..', 'runtime');
const NODE_EXE = path.join(runtimeRoot, 'node', 'node.exe');
const DSH_BIN = path.join(runtimeRoot, 'dsh', 'node_modules', '@deepseek-ai', 'dsh', 'lib', 'bin.js');
const DSH_CWD = path.join(runtimeRoot, 'dsh');

// ---------------------------------------------------------------- state
let mainWindow = null;
let serverProcess = null;        // the dsh node child we spawned (if any)
let spawnedByUs = false;
let shuttingDown = false;
let startingUp = false;
let pollTimer = null;
let lastLogTail = '';
let stateFile = path.join(app.getPath('userData'), 'server-state.json');

const port = Number(process.env.DSH_LAUNCHER_PORT || DEFAULT_PORT);
const dshHome = process.env.DSH_LAUNCHER_HOME || process.env.DSH_HOME || path.join(os.homedir(), '.dsh');
const timeoutMs = Number(process.env.DSH_LAUNCHER_TIMEOUT_MS || DEFAULT_TIMEOUT_MS);
const webUrl = `http://127.0.0.1:${port}/`;

// ---------------------------------------------------------------- logging
function logPath() {
  const dir = path.join(app.getPath('userData'), 'logs');
  fs.mkdirSync(dir, { recursive: true });
  return path.join(dir, 'launcher.log');
}
function log(...args) {
  const line = `[${new Date().toISOString()}] ${args.join(' ')}\n`;
  try { fs.appendFileSync(logPath(), line); } catch {}
  console.log(...args);
}
function serverLogPath() {
  const dir = path.join(app.getPath('userData'), 'logs');
  fs.mkdirSync(dir, { recursive: true });
  return path.join(dir, 'server.log');
}
function appendServerLog(chunk) {
  try { fs.appendFileSync(serverLogPath(), chunk); } catch {}
  lastLogTail = (lastLogTail + chunk).slice(-LOG_TAIL_BYTES);
}

// ---------------------------------------------------------------- state file
function writeState() {
  try {
    fs.writeFileSync(stateFile, JSON.stringify({
      pid: serverProcess ? serverProcess.pid : null,
      port,
      spawnedByUs,
      updatedAt: new Date().toISOString(),
    }));
  } catch {}
}
function clearState() {
  try { fs.unlinkSync(stateFile); } catch {}
}
function readState() {
  try { return JSON.parse(fs.readFileSync(stateFile, 'utf8')); } catch { return null; }
}

// ---------------------------------------------------------------- helpers
function tcpProbe(port, ms) {
  return new Promise((resolve) => {
    const socket = net.connect({ host: '127.0.0.1', port });
    const done = (ok) => { socket.destroy(); resolve(ok); };
    socket.setTimeout(ms);
    socket.once('connect', () => done(true));
    socket.once('timeout', () => done(false));
    socket.once('error', () => done(false));
  });
}

function httpGet(pathname, ms) {
  return new Promise((resolve) => {
    const req = http.get({ host: '127.0.0.1', port, path: pathname, timeout: ms }, (res) => {
      let body = '';
      res.setEncoding('utf8');
      res.on('data', (d) => { body += d; if (body.length > 200000) { req.destroy(); resolve({ status: res.statusCode, body: body.slice(0, 200000) }); } });
      res.on('end', () => resolve({ status: res.statusCode, body }));
      res.on('error', () => resolve({ status: -1, body: '' }));
    });
    req.on('timeout', () => { req.destroy(); resolve({ status: -1, body: '' }); });
    req.on('error', () => resolve({ status: -1, body: '' }));
  });
}

// Probe port state: 'free' | 'dsh' | 'other'
async function probePort() {
  const listening = await tcpProbe(port, 1500);
  if (!listening) return 'free';
  try {
    const res = await httpGet('/', 2500);
    if (res.status === 200 && res.body.includes(BOOT_MARKER)) return 'dsh';
  } catch {}
  return 'other';
}

// ---------------------------------------------------------------- server lifecycle
function spawnServer() {
  if (!fs.existsSync(NODE_EXE)) throw new Error(`捆绑的 Node 运行时缺失: ${NODE_EXE}`);
  if (!fs.existsSync(DSH_BIN)) throw new Error(`捆绑的 dsh 缺失: ${DSH_BIN}`);

  log(`spawning: ${NODE_EXE} ${DSH_BIN} web --port ${port}`);
  log(`DSH_HOME=${dshHome}  cwd=${DSH_CWD}`);

  const child = spawn(NODE_EXE, [DSH_BIN, 'web', '--port', String(port)], {
    cwd: DSH_CWD,
    env: { ...process.env, DSH_HOME: dshHome },
    windowsHide: true,
    stdio: ['ignore', 'pipe', 'pipe'],
  });

  child.stdout.on('data', (d) => appendServerLog(d));
  child.stderr.on('data', (d) => appendServerLog(d));

  child.on('error', (err) => {
    log('spawn error:', err.message);
    appendServerLog(`[launcher] spawn error: ${err.message}\n`);
  });

  child.on('exit', (code, signal) => {
    log(`dsh server exited: code=${code} signal=${signal} (shuttingDown=${shuttingDown})`);
    if (shuttingDown) return;
    if (serverProcess === child) serverProcess = null;
    clearState();
    if (startingUp) return; // poll loop will hit timeout and show its own error
    showError(`DeepSeek Harness 服务意外退出（退出码 ${code ?? signal ?? '未知'}）`, lastLogTail);
  });

  serverProcess = child;
  spawnedByUs = true;
  writeState();
  return child;
}

function killServerTree() {
  const pid = serverProcess ? serverProcess.pid : (readState()?.pid || null);
  if (!pid) return;
  log(`cleaning up dsh process tree (pid=${pid})`);
  const tk = () => {
    try { spawn('taskkill', ['/PID', String(pid), '/T', '/F'], { stdio: 'ignore', windowsHide: true }).unref(); } catch {}
  };
  if (serverProcess) { try { serverProcess.kill(); } catch {} }
  tk();
  setTimeout(tk, 2000).unref?.();
  serverProcess = null;
  clearState();
}

// ---------------------------------------------------------------- polling
function waitForServer(timeoutMs) {
  return new Promise((resolve, reject) => {
    const started = Date.now();
    const tick = async () => {
      if (shuttingDown) return reject(new Error('shutdown'));
      if (serverProcess && serverProcess.exitCode !== null) {
        return reject(new Error(`dsh 进程已退出（code=${serverProcess.exitCode}）`));
      }
      try {
        const res = await httpGet('/', 2000);
        if (res.status === 200 && res.body.includes(BOOT_MARKER)) return resolve();
      } catch {}
      if (Date.now() - started > timeoutMs) {
        return reject(new Error(`等待 DeepSeek Harness 启动超时（${Math.round(timeoutMs / 1000)} 秒）`));
      }
      pollTimer = setTimeout(tick, POLL_INTERVAL_MS);
    };
    pollTimer = setTimeout(tick, POLL_INTERVAL_MS);
  });
}

function stopPolling() {
  if (pollTimer) { clearTimeout(pollTimer); pollTimer = null; }
}

// ---------------------------------------------------------------- UI
function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1440,
    height: 900,
    minWidth: 900,
    minHeight: 600,
    title: APP_NAME,
    autoHideMenuBar: true,
    backgroundColor: '#0d1117',
    show: false,
    icon: path.join(__dirname, 'renderer', 'whale.png'),
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      preload: path.join(__dirname, 'preload.js'),
    },
  });

  mainWindow.once('ready-to-show', () => mainWindow.show());
  mainWindow.on('closed', () => { mainWindow = null; });

  // Prevent the DSH UI from navigating away from the app.
  mainWindow.webContents.on('will-navigate', (e, url) => {
    if (!url.startsWith('file://') && !url.startsWith(webUrl)) e.preventDefault();
  });
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith('http://') || url.startsWith('https://')) shell.openExternal(url);
    return { action: 'deny' };
  });
}

function showLoading() {
  createWindow();
  mainWindow.loadFile(path.join(__dirname, 'renderer', 'loading.html'));
}

function showError(msg, tail) {
  stopPolling();
  log('showError:', msg);
  if (!mainWindow) createWindow();
  mainWindow.loadFile(path.join(__dirname, 'renderer', 'error.html'), {
    query: { msg, tail: tail || lastLogTail, port: String(port), home: dshHome },
  });
}

function loadWebUi() {
  log('port ready, loading', webUrl);
  if (!mainWindow) createWindow();
  mainWindow.loadURL(webUrl);
}

// ---------------------------------------------------------------- restart
async function restartServer() {
  if (startingUp) return;
  stopPolling();
  killServerTree();
  lastLogTail = '';
  await startApp();
}

// ---------------------------------------------------------------- startup
async function startApp() {
  if (startingUp) return;
  startingUp = true;
  log('--- launch ---');
  log(`runtimeRoot=${runtimeRoot}  isPackaged=${isPackaged}`);
  log(`port=${port}  DSH_HOME=${dshHome}  timeout=${timeoutMs}ms`);
  showLoading();

  try {
    // 1. If a previous crash left OUR orphan server on the port, adopt and clean it.
    const state = readState();
    if (state && state.pid && state.spawnedByUs) {
      try {
        process.kill(state.pid, 0); // throws if not alive
        // alive: it is our orphan from a crashed launcher -> reclaim the port
        log(`adopting orphan server pid=${state.pid} from previous session`);
        spawn('taskkill', ['/PID', String(state.pid), '/T', '/F'], { stdio: 'ignore', windowsHide: true }).unref();
        await new Promise((r) => setTimeout(r, 1500));
      } catch {}
      clearState();
    }

    // 2. Probe the port.
    const stateNow = await probePort();
    log(`port ${port} state: ${stateNow}`);

    if (stateNow === 'other') {
      showError(
        `端口 ${port} 已被其他程序占用，无法启动 DeepSeek Harness。\n\n请关闭占用 ${port} 端口的程序后重试。（未对任何其他程序执行操作）`,
        ''
      );
      startingUp = false;
      return;
    }

    if (stateNow === 'dsh') {
      // Already a live DeepSeek Harness (e.g. the npx-based instance). Connect directly.
      log('existing DSH instance detected on port — connecting without spawning');
      spawnedByUs = false;
      clearState();
      loadWebUi();
      startingUp = false;
      return;
    }

    // 3. Spawn our own server and wait for readiness.
    spawnServer();
    try {
      await waitForServer(timeoutMs);
      loadWebUi();
    } catch (err) {
      log('startup failed:', err.message);
      showError(
        `DeepSeek Harness 启动失败\n\n${err.message}\n\nWeb 地址: ${webUrl}\n运行目录: ${runtimeRoot}\nDSH_HOME: ${dshHome}`,
        lastLogTail
      );
      // leave the child running briefly so its output keeps streaming? No — kill it.
      killServerTree();
    }
  } catch (err) {
    log('fatal startup error:', err);
    showError(`DeepSeek Harness 启动失败：${err.message}`, lastLogTail);
  } finally {
    startingUp = false;
  }
}

// ---------------------------------------------------------------- app events
const gotLock = app.requestSingleInstanceLock();
if (!gotLock) {
  app.quit();
} else {
  app.on('second-instance', () => {
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.focus();
    }
  });

  ipcMain.on('harness:quit', () => app.quit());
  ipcMain.on('harness:restart', () => restartServer());
  ipcMain.on('harness:open-browser', () => shell.openExternal(webUrl));

  app.whenReady().then(() => {
    buildMenu();
    startApp();
  });

  // Windows: clean shutdown when the OS session ends (logoff/shutdown).
  app.on('session-end', () => app.quit());

  app.on('before-quit', () => {
    shuttingDown = true;
    stopPolling();
    killServerTree();
  });
  app.on('window-all-closed', () => app.quit());

  // Hard-crash belt: also try cleanup on normal process exit.
  process.on('exit', () => { try { clearState(); } catch {} });
}

// ---------------------------------------------------------------- menu
function buildMenu() {
  const template = [
    {
      label: '文件',
      submenu: [
        { label: '在浏览器中打开', accelerator: 'Ctrl+Shift+B', click: () => shell.openExternal(webUrl) },
        { type: 'separator' },
        { label: '退出', accelerator: 'Ctrl+Q', click: () => app.quit() },
      ],
    },
    {
      label: '帮助',
      submenu: [
        {
          label: '关于 DeepSeek Harness',
          click: () => {
            dialog.showMessageBox(mainWindow, {
              type: 'info',
              title: '关于 DeepSeek Harness',
              message: 'DeepSeek Harness 桌面版',
              detail: `版本: ${app.getVersion()}\nWeb: ${webUrl}\nDSH_HOME: ${dshHome}\n运行时: ${runtimeRoot}`,
            });
          },
        },
      ],
    },
  ];
  Menu.setApplicationMenu(Menu.buildFromTemplate(template));
}
