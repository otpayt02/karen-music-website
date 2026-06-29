param(
    [string]$AppName = "KarenMusicDirector",
    [string]$IconPath = "",
    [switch]$InstallBuildDeps,
    [switch]$SkipStoppingRunningApp
)

$ErrorActionPreference = "Stop"

$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$ProjectRoot = (Resolve-Path (Join-Path $ScriptDir "..")).Path
Set-Location $ProjectRoot

if (-not $IconPath) {
    $IconPath = Join-Path $ScriptDir "app.ico"
}

if (-not $SkipStoppingRunningApp) {
    $runningApps = @(Get-Process -Name $AppName -ErrorAction SilentlyContinue)
    if ($runningApps.Count -gt 0) {
        Write-Host "Stopping running $AppName process(es) so PyInstaller can replace dist files..."
        $runningApps | Stop-Process -Force
        Start-Sleep -Seconds 2
    }
}

if ($InstallBuildDeps) {
    python -m pip install -r requirements.txt -r requirements-build.txt
    if ($LASTEXITCODE -ne 0) {
        throw "Dependency installation failed."
    }
}

$PathlibBackportInstalled = python -c "import importlib.metadata as m; import sys; sys.exit(0 if any(d.metadata['Name'].lower() == 'pathlib' for d in m.distributions()) else 1)"
if ($LASTEXITCODE -eq 0) {
    Write-Host "Removing obsolete pathlib backport because it is incompatible with PyInstaller on Python 3..."
    python -m pip uninstall -y pathlib
    if ($LASTEXITCODE -ne 0) {
        throw "Failed to uninstall obsolete pathlib backport. Run: python -m pip uninstall pathlib"
    }
} elseif ($LASTEXITCODE -ne 1) {
    throw "Failed to inspect installed Python packages for obsolete pathlib backport."
}

if (-not (Test-Path $IconPath)) {
    python (Join-Path $ScriptDir "create_default_icon.py") $IconPath
    if ($LASTEXITCODE -ne 0) {
        throw "Icon generation failed."
    }
}

$DistPath = Join-Path $ProjectRoot "dist"
$WorkPath = Join-Path $ProjectRoot "build\pyinstaller"
$SpecPath = Join-Path $ProjectRoot "build\pyinstaller"

$pyinstallerArgs = @(
    "--noconfirm",
    "--clean",
    "--windowed",
    "--name", $AppName,
    "--icon", $IconPath,
    "--distpath", $DistPath,
    "--workpath", $WorkPath,
    "--specpath", $SpecPath,
    "--add-data", "$ProjectRoot\index.html;.",
    "--add-data", "$ProjectRoot\songs.db;.",
    "--add-data", "$ProjectRoot\static;static",
    "--add-data", "$ProjectRoot\chart_images;chart_images",
    "--add-data", "$IconPath;.",
    "--hidden-import", "werkzeug.serving",
    "--collect-submodules", "werkzeug",
    "--collect-data", "werkzeug",
    "--collect-submodules", "webview",
    "--collect-data", "webview",
    "karen_music_desktop.py"
)

$translationFiles = Get-ChildItem -LiteralPath $ProjectRoot -File |
    Where-Object { $_.Name -match 'translation' -and $_.Extension -ieq '.txt' }
foreach ($translationFile in $translationFiles) {
    $pyinstallerArgs += @("--add-data", "$($translationFile.FullName);.")
}

python -m PyInstaller @pyinstallerArgs
if ($LASTEXITCODE -ne 0) {
    throw "PyInstaller failed."
}

$AppDist = Join-Path $DistPath $AppName
$DistIcon = Join-Path $AppDist "app.ico"
Copy-Item -LiteralPath $IconPath -Destination $DistIcon -Force

Write-Host ""
Write-Host "Built Windows app:"
Write-Host "  $AppDist\$AppName.exe"
Write-Host ""
Write-Host "Desktop shortcut icon:"
Write-Host "  Replace $IconPath with another .ico, rerun this script, then rerun create_desktop_shortcut.ps1."
