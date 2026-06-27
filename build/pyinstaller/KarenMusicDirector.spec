# -*- mode: python ; coding: utf-8 -*-
from PyInstaller.utils.hooks import collect_data_files
from PyInstaller.utils.hooks import collect_submodules

datas = [('C:\\Users\\olive\\Projects\\music_director_database\\karen_music_website\\index.html', '.'), ('C:\\Users\\olive\\Projects\\music_director_database\\karen_music_website\\songs.db', '.'), ('C:\\Users\\olive\\Projects\\music_director_database\\karen_music_website\\static', 'static'), ('C:\\Users\\olive\\Projects\\music_director_database\\karen_music_website\\chart_images', 'chart_images'), ('C:\\Users\\olive\\Projects\\music_director_database\\karen_music_website\\packaging\\app.ico', '.'), ('C:\\Users\\olive\\Projects\\music_director_database\\karen_music_website\\translations_updated.txt', '.')]
hiddenimports = ['werkzeug.serving']
datas += collect_data_files('werkzeug')
datas += collect_data_files('webview')
hiddenimports += collect_submodules('werkzeug')
hiddenimports += collect_submodules('webview')


a = Analysis(
    ['..\\..\\karen_music_desktop.py'],
    pathex=[],
    binaries=[],
    datas=datas,
    hiddenimports=hiddenimports,
    hookspath=[],
    hooksconfig={},
    runtime_hooks=[],
    excludes=[],
    noarchive=False,
    optimize=0,
)
pyz = PYZ(a.pure)

exe = EXE(
    pyz,
    a.scripts,
    [],
    exclude_binaries=True,
    name='KarenMusicDirector',
    debug=False,
    bootloader_ignore_signals=False,
    strip=False,
    upx=True,
    console=False,
    disable_windowed_traceback=False,
    argv_emulation=False,
    target_arch=None,
    codesign_identity=None,
    entitlements_file=None,
    icon=['C:\\Users\\olive\\Projects\\music_director_database\\karen_music_website\\packaging\\app.ico'],
)
coll = COLLECT(
    exe,
    a.binaries,
    a.datas,
    strip=False,
    upx=True,
    upx_exclude=[],
    name='KarenMusicDirector',
)
