const { spawnSync } = require('node:child_process');
const path = require('node:path');
const { pythonCommand } = require('./launcher.cjs');
const root = path.resolve(__dirname, '..');
const result = spawnSync(pythonCommand(root), ['-m', 'PyInstaller', '--noconfirm', '--clean', '--distpath', '.backend-dist', '--workpath', '.backend-build', 'desktop/backend.spec'], {
  cwd: root, stdio: 'inherit', windowsHide: true,
});
if (result.error) throw result.error;
process.exitCode = result.status ?? 1;
