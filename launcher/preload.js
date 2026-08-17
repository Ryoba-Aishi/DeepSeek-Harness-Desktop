// Preload: minimal, benign bridge used only by the launcher's own pages.
const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('harness', {
  quit: () => ipcRenderer.send('harness:quit'),
  restart: () => ipcRenderer.send('harness:restart'),
  openBrowser: () => ipcRenderer.send('harness:open-browser'),
  platform: process.platform,
});
