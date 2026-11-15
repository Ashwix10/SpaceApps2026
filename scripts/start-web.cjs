const { spawn } = require('node:child_process');
const { existsSync } = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const python = process.env.ASTROTWIN_PYTHON || path.join(root, '.venv', process.platform === 'win32' ? 'Scripts/python.exe' : 'bin/python');
if (!existsSync(python)) throw new Error('Python environment missing. Follow the setup steps in README.md.');
const port = Number(process.env.PORT || 8000);
if (!Number.isInteger(port) || port < 1 || port > 65535) throw new Error('PORT must be between 1 and 65535.');
const child = spawn(python, ['-u', '-m', 'api.serve', '--host', '127.0.0.1', '--port', String(port), '--managed'], {
  cwd: root, windowsHide: true, stdio: ['pipe', 'inherit', 'inherit'], env: process.env,
});
console.log(`\nAstroTwin — open http://localhost:${port}\nPress Ctrl+C to stop.\n`);
child.stdin.on('error', () => {});
child.once('error', error => { console.error(error.message); process.exitCode = 1; });
child.once('exit', code => { process.exitCode = code ?? 0; if (code) console.error('AstroTwin could not start or stopped unexpectedly. Check that port ' + port + ' is available and the Python environment is installed.'); });
let stopping = false;
function stop() {
  if (stopping) return;
  stopping = true;
  child.stdin.end('shutdown\n');
  setTimeout(() => child.kill('SIGTERM'), 4000).unref();
}
process.once('SIGINT', stop);
process.once('SIGTERM', stop);
