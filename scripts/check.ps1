param([switch]$SkipInstall)
$ErrorActionPreference = 'Stop'
$repoRoot = Split-Path $PSScriptRoot -Parent
Push-Location $repoRoot
$server = $null
try {
    if (-not (Test-Path '.venv/Scripts/python.exe')) {
        if (Get-Command py -ErrorAction SilentlyContinue) { & py -3.11 -m venv .venv }
        else { & python -m venv .venv }
        if ($LASTEXITCODE -ne 0) { throw 'Install Python 3.11 and create .venv first.' }
    }
    $pythonPath = Join-Path $repoRoot '.venv/Scripts/python.exe'
    if (-not $SkipInstall) {
        & $pythonPath -m pip install -e model -e explain -r api/requirements.txt
        if ($LASTEXITCODE -ne 0) { throw 'Python dependency installation failed.' }
        Push-Location web
        try {
            if (Test-Path package-lock.json) { & npm.cmd ci }
            else { & npm.cmd install }
            if ($LASTEXITCODE -ne 0) { throw 'Web dependency installation failed.' }
        } finally { Pop-Location }
    }
    & $pythonPath -m pytest model api explain
    if ($LASTEXITCODE -ne 0) { throw 'Python tests failed.' }
    Push-Location web
    try {
        & npm.cmd test
        if ($LASTEXITCODE -ne 0) { throw 'Frontend contract tests failed.' }
        & npm.cmd run build
        if ($LASTEXITCODE -ne 0) { throw 'Web build failed.' }
    } finally { Pop-Location }
    & npm.cmd run test:desktop
    if ($LASTEXITCODE -ne 0) { throw 'Desktop lifecycle tests failed.' }
    & npm.cmd run smoke:desktop
    if ($LASTEXITCODE -ne 0) { throw 'Desktop host smoke test failed.' }
    # Use a separate port so an existing development API is left alone.
    $server = Start-Process -FilePath $pythonPath -ArgumentList '-m','uvicorn','api.main:app','--host','127.0.0.1','--port','18000' -WorkingDirectory $repoRoot -WindowStyle Hidden -PassThru
    $ready = $false
    for ($attempt = 0; $attempt -lt 40; $attempt++) {
        if ($server.HasExited) { throw 'The smoke-test API could not start.' }
        try {
            $null = Invoke-RestMethod 'http://127.0.0.1:18000/api/health' -TimeoutSec 1
            $ready = $true
            break
        } catch { Start-Sleep -Milliseconds 250 }
    }
    if (-not $ready) { throw 'The smoke-test API did not become ready.' }
    & $pythonPath scripts/smoke.py http://127.0.0.1:18000
    if ($LASTEXITCODE -ne 0) { throw 'API smoke test failed.' }
    Write-Host 'PASS: Python/frontend tests, build, standalone API, and desktop host/lifecycle checks. Electron window and installer require separate launch tests.'
} finally {
    if ($server -and -not $server.HasExited) { Stop-Process -Id $server.Id }
    Pop-Location
}
