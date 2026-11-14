# Run from repo root through npm run build:backend. One-folder bundle, no Python install needed.
from pathlib import Path
from PyInstaller.utils.hooks import collect_submodules

root = Path(SPECPATH).parent
analysis = Analysis(
    [str(root / 'desktop' / 'backend.py')],
    pathex=[str(root), str(root / 'model'), str(root / 'explain')],
    binaries=[],
    datas=[(str(root / 'data'), 'data'), (str(root / 'web' / 'dist'), 'web/dist')],
    hiddenimports=collect_submodules('uvicorn') + collect_submodules('astrotwin_model') + collect_submodules('astrotwin_explain'),
    hookspath=[], hooksconfig={}, runtime_hooks=[], excludes=[], noarchive=False,
)
pyz = PYZ(analysis.pure)
exe = EXE(pyz, analysis.scripts, [], exclude_binaries=True, name='astrotwin-backend',
          debug=False, bootloader_ignore_signals=False, strip=False, upx=False, console=True)
collection = COLLECT(exe, analysis.binaries, analysis.datas, strip=False, upx=False, name='astrotwin-backend')
