# Packaging Karen Music Director

## Windows executable

Build the desktop app:

```powershell
.\packaging\build_windows.ps1 -InstallBuildDeps
```

Output:

```text
dist\KarenMusicDirector\KarenMusicDirector.exe
```

The executable opens the website in its own desktop app window using WebView2 instead of launching the default browser.

Create or refresh the desktop shortcut:

```powershell
.\packaging\create_desktop_shortcut.ps1
```

## Change the desktop shortcut picture

Replace this file with another Windows `.ico` file:

```text
packaging\app.ico
```

Then rebuild and recreate the shortcut:

```powershell
.\packaging\build_windows.ps1
.\packaging\create_desktop_shortcut.ps1
```

The shortcut points to `dist\KarenMusicDirector\app.ico`, so you can also replace that file and rerun `create_desktop_shortcut.ps1` when you only want to refresh the shortcut icon.

## Microsoft Store package

Build an unsigned MSIX package after the Windows executable exists:

```powershell
.\packaging\build_msix.ps1
```

Output:

```text
dist\msix\KarenMusicDirector-1.0.0.0.msix
```

Before Store submission, reserve the app name in Partner Center and replace these values with the exact Partner Center identity:

```powershell
.\packaging\build_msix.ps1 `
  -PackageName "PartnerCenter.PackageName" `
  -Publisher "CN=Partner Center Publisher ID" `
  -PublisherDisplayName "Your Publisher Name" `
  -DisplayName "Karen Music Director" `
  -Version "1.0.0.0"
```

Microsoft's current Win32 Store guidance supports either MSIX packaging or listing an existing EXE/MSI installer. This project uses the MSIX path because it gives Store-managed install/update behavior.
