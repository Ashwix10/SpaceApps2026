const { app, BrowserWindow, dialog, Menu, session } = require('electron');
const path = require('node:path');
const { launchBackend } = require('./launcher.cjs');

let backend;
let mainWindow;
let quitting = false;
const root = path.resolve(__dirname, '..');

if (!app.requestSingleInstanceLock()) app.quit();
else {
  app.on('second-instance', () => {
    if (mainWindow) { if (mainWindow.isMinimized()) mainWindow.restore(); mainWindow.focus(); }
  });
  app.whenReady().then(async () => {
    Menu.setApplicationMenu(null);
    backend = launchBackend({ root, packaged: app.isPackaged, resourcesPath: process.resourcesPath,
      onLog: text => console.error(text),
      onUnexpectedExit: () => { dialog.showErrorBox('AstroTwin backend stopped', 'Close and reopen AstroTwin. Your local forecast service stopped unexpectedly.'); app.quit(); },
    });
    try {
      const { origin, token } = await backend.ready;
      if (quitting) return;
      // Token stays in the main process. Renderer code receives no Node or IPC privileges.
      const isolatedSession = session.fromPartition(`astrotwin-${process.pid}`);
      isolatedSession.setPermissionRequestHandler((_contents, _permission, callback) => callback(false));
      isolatedSession.setPermissionCheckHandler(() => false);
      isolatedSession.webRequest.onBeforeRequest((details, callback) => {
        callback({ cancel: !details.url.startsWith(`${origin}/`) && !details.url.startsWith('devtools:') });
      });
      isolatedSession.webRequest.onBeforeSendHeaders((details, callback) => {
        if (details.url.startsWith(`${origin}/`)) details.requestHeaders['X-AstroTwin-Session'] = token;
        callback({ requestHeaders: details.requestHeaders });
      });
      mainWindow = new BrowserWindow({ width: 1500, height: 1000, minWidth: 900, minHeight: 650,
        backgroundColor: '#0B0F1A', title: 'AstroTwin', show: false,
        webPreferences: { session: isolatedSession, nodeIntegration: false, contextIsolation: true, sandbox: true, webSecurity: true },
      });
      mainWindow.webContents.setWindowOpenHandler(() => ({ action: 'deny' }));
      mainWindow.webContents.on('will-navigate', (event, url) => { if (new URL(url).origin !== origin) event.preventDefault(); });
      mainWindow.webContents.on('will-attach-webview', event => event.preventDefault());
      mainWindow.once('ready-to-show', () => mainWindow.show());
      mainWindow.on('closed', () => { mainWindow = null; });
      await mainWindow.loadURL(origin);
    } catch (error) {
      if (!quitting) dialog.showErrorBox('AstroTwin could not start', `${error.message}\n\nFor development, follow the desktop setup in README. For an installed copy, reinstall the complete app.`);
      app.quit();
    }
  }).catch(error => { dialog.showErrorBox('AstroTwin startup failed', error.message); app.quit(); });
  app.on('window-all-closed', () => app.quit());
  app.on('before-quit', event => {
    if (quitting) return;
    event.preventDefault(); quitting = true;
    Promise.resolve(backend?.stop()).finally(() => app.quit());
  });
}
