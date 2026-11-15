const { spawnSync } = require('node:child_process');
const path = require('node:path');
if (!process.env.npm_execpath) throw new Error('Run this through npm run build:web');
const result = spawnSync(process.execPath, [process.env.npm_execpath, '--prefix', 'web', 'run', 'build'], {
  cwd: path.resolve(__dirname, '..'), stdio: 'inherit', windowsHide: true,
  env: { ...process.env, VITE_API_URL: '/api', VITE_USE_MOCKS: 'false' },
});
if (result.error) throw result.error;
process.exitCode = result.status ?? 1;
