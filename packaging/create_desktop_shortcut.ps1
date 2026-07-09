param(
    [string]$AppName = "KarenMusicDirector",
    [string]$ShortcutName = "Karen Music Director",
    [string]$AppPath = "",
    [string]$IconPath = ""
)

$ErrorActionPreference = "Stop"

$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$ProjectRoot = Resolve-Path (Join-Path $ScriptDir "..")
$PackageAppPath = Join-Path $ProjectRoot "build\package-dist\$AppName\$AppName.exe"
$DistAppPath = Join-Path $ProjectRoot "dist\$AppName\$AppName.exe"

if (-not $AppPath) {
    if (Test-Path $PackageAppPath) {
        $AppPath = $PackageAppPath
    } else {
        $AppPath = $DistAppPath
    }
}
if (-not $IconPath) {
    $PackageIconPath = Join-Path $ProjectRoot "build\package-dist\$AppName\app.ico"
    if (Test-Path $PackageIconPath) {
        $IconPath = $PackageIconPath
    } else {
        $IconPath = Join-Path $ProjectRoot "dist\$AppName\app.ico"
    }
}

$ResolvedAppPath = Resolve-Path $AppPath
$WorkingDirectory = Split-Path -Parent $ResolvedAppPath
$Desktop = [Environment]::GetFolderPath("Desktop")
$ShortcutPath = Join-Path $Desktop "$ShortcutName.lnk"

$Shell = New-Object -ComObject WScript.Shell
$Shortcut = $Shell.CreateShortcut($ShortcutPath)
$Shortcut.TargetPath = $ResolvedAppPath.Path
$Shortcut.WorkingDirectory = $WorkingDirectory

if (Test-Path $IconPath) {
    $Shortcut.IconLocation = (Resolve-Path $IconPath).Path
}

$Shortcut.Save()

Write-Host "Created desktop shortcut:"
Write-Host "  $ShortcutPath"
