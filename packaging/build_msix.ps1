param(
    [string]$PackageName = "KarenMusicDirector",
    [string]$Publisher = "CN=KarenMusicDirector",
    [string]$PublisherDisplayName = "Karen Music Director",
    [string]$DisplayName = "Karen Music Director",
    [string]$Description = "Karen worship music editor and music director database.",
    [string]$Version = "1.0.0.0"
)

$ErrorActionPreference = "Stop"

$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$ProjectRoot = Resolve-Path (Join-Path $ScriptDir "..")
$AppDist = Join-Path $ProjectRoot "dist\KarenMusicDirector"
$AppExe = Join-Path $AppDist "KarenMusicDirector.exe"

if (-not (Test-Path $AppExe)) {
    & (Join-Path $ScriptDir "build_windows.ps1")
}

python (Join-Path $ScriptDir "create_msix_assets.py")
if ($LASTEXITCODE -ne 0) {
    throw "MSIX asset generation failed."
}

$MsixRoot = Join-Path $ProjectRoot "dist\msix"
$PackageRoot = Join-Path $MsixRoot "Package"
$ResolvedMsixRoot = [System.IO.Path]::GetFullPath($MsixRoot)
$ResolvedPackageRoot = [System.IO.Path]::GetFullPath($PackageRoot)

if (-not $ResolvedPackageRoot.StartsWith($ResolvedMsixRoot, [System.StringComparison]::OrdinalIgnoreCase)) {
    throw "Refusing to clear package folder outside dist\msix."
}

if (Test-Path $PackageRoot) {
    Remove-Item -LiteralPath $PackageRoot -Recurse -Force
}

New-Item -ItemType Directory -Force -Path (Join-Path $PackageRoot "App") | Out-Null
New-Item -ItemType Directory -Force -Path (Join-Path $PackageRoot "Assets") | Out-Null

Copy-Item -Path (Join-Path $AppDist "*") -Destination (Join-Path $PackageRoot "App") -Recurse -Force
Copy-Item -Path (Join-Path $ScriptDir "msix\Assets\*") -Destination (Join-Path $PackageRoot "Assets") -Recurse -Force

$Template = Get-Content -LiteralPath (Join-Path $ScriptDir "msix\AppxManifest.xml.template") -Raw
$Manifest = $Template
$Manifest = $Manifest.Replace("{{PackageName}}", $PackageName)
$Manifest = $Manifest.Replace("{{Publisher}}", $Publisher)
$Manifest = $Manifest.Replace("{{Version}}", $Version)
$Manifest = $Manifest.Replace("{{DisplayName}}", $DisplayName)
$Manifest = $Manifest.Replace("{{PublisherDisplayName}}", $PublisherDisplayName)
$Manifest = $Manifest.Replace("{{Description}}", $Description)

Set-Content -LiteralPath (Join-Path $PackageRoot "AppxManifest.xml") -Value $Manifest -Encoding UTF8

$MakeAppx = Get-Command makeappx.exe -ErrorAction SilentlyContinue
if (-not $MakeAppx) {
    $WindowsKitBin = Join-Path ${env:ProgramFiles(x86)} "Windows Kits\10\bin"
    $MakeAppx = Get-ChildItem -Path $WindowsKitBin -Recurse -Filter makeappx.exe -ErrorAction SilentlyContinue |
        Where-Object { $_.FullName -match "\\x64\\makeappx.exe$" } |
        Sort-Object FullName -Descending |
        Select-Object -First 1
}

if (-not $MakeAppx) {
    throw "makeappx.exe was not found. Install the Windows SDK or use Visual Studio's packaging tools."
}

$MakeAppxPath = if ($MakeAppx.Source) { $MakeAppx.Source } else { $MakeAppx.FullName }

$OutputPackage = Join-Path $MsixRoot "$PackageName-$Version.msix"
New-Item -ItemType Directory -Force -Path $MsixRoot | Out-Null
& $MakeAppxPath pack /d $PackageRoot /p $OutputPackage /o
if ($LASTEXITCODE -ne 0) {
    throw "makeappx failed."
}

Write-Host ""
Write-Host "Built unsigned MSIX package:"
Write-Host "  $OutputPackage"
Write-Host ""
Write-Host "For Microsoft Store submission, replace the PackageName and Publisher with the values from Partner Center."
Write-Host "The Store can sign packaged desktop apps during certification; sideloading requires your own certificate."
