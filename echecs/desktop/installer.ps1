# Installe le programme « Custom Chess » dans %LOCALAPPDATA%\Programs\Custom Chess, sans rien télécharger :
# il reprend le moteur de fenêtre Electron déjà installé avec Colosses, y met main.js, et pose l'icône du cavalier.
# Crée aussi les raccourcis Bureau + menu Démarrer, et installe MoteurCustomChess.exe (lancé avec Windows).
$ErrorActionPreference = 'Stop'
$ici = Split-Path -Parent $MyInvocation.MyCommand.Path
$base = Join-Path $env:LOCALAPPDATA 'Programs\Colosses'
$dest = Join-Path $env:LOCALAPPDATA 'Programs\Custom Chess'
$moteurDir = Join-Path $env:LOCALAPPDATA 'CustomChess'
if (-not (Test-Path "$base\Colosses.exe")) { throw "Colosses (programme) introuvable : il fournit le moteur de fenêtre Electron." }

Get-Process 'Custom Chess' -ErrorAction SilentlyContinue | Stop-Process -Force
Start-Sleep -Milliseconds 500
New-Item -ItemType Directory -Force $dest | Out-Null
# le moteur de fenêtre (sans le jeu Colosses)
Get-ChildItem $base -File | Where-Object { $_.Name -ne 'Colosses.exe' } | Copy-Item -Destination $dest -Force
Copy-Item "$base\locales" $dest -Recurse -Force
New-Item -ItemType Directory -Force "$dest\resources\app" | Out-Null
Copy-Item "$base\Colosses.exe" "$dest\Custom Chess.exe" -Force
foreach ($f in 'main.js', 'package.json', 'icone.png') { Copy-Item (Join-Path $ici $f) "$dest\resources\app\$f" -Force }
# icône et nom du programme
$rcedit = Get-ChildItem "$env:LOCALAPPDATA\electron-builder\Cache\winCodeSign" -Recurse -Filter 'rcedit-x64.exe' | Select-Object -First 1
$ico = Join-Path $ici '..\windows\CustomChess.ico'
if ($rcedit) {
  & $rcedit.FullName "$dest\Custom Chess.exe" --set-icon $ico --set-version-string FileDescription 'Custom Chess' --set-version-string ProductName 'Custom Chess' --set-version-string OriginalFilename 'Custom Chess.exe' --set-version-string CompanyName 'Juldorange'
}
Copy-Item $ico "$dest\CustomChess.ico" -Force

# le moteur (Stockfish) : copie fixe + lancement avec Windows
New-Item -ItemType Directory -Force $moteurDir | Out-Null
$enMarche = Get-Process MoteurCustomChess -ErrorAction SilentlyContinue
$nouveau = Join-Path $ici '..\windows\MoteurCustomChess.exe'
if ((-not (Test-Path "$moteurDir\MoteurCustomChess.exe")) -or ((Get-FileHash $nouveau).Hash -ne (Get-FileHash "$moteurDir\MoteurCustomChess.exe").Hash)) {
  if ($enMarche) { $enMarche | Stop-Process -Force; Start-Sleep -Seconds 1 }
  Copy-Item $nouveau "$moteurDir\MoteurCustomChess.exe" -Force
}
Set-ItemProperty -Path HKCU:\Software\Microsoft\Windows\CurrentVersion\Run -Name MoteurCustomChess -Value ('"' + "$moteurDir\MoteurCustomChess.exe" + '" /demarrage')
if (-not (Get-Process MoteurCustomChess -ErrorAction SilentlyContinue)) { Start-Process "$moteurDir\MoteurCustomChess.exe" -ArgumentList '/demarrage' }

# raccourcis
$sh = New-Object -ComObject WScript.Shell
$menu = Join-Path ([Environment]::GetFolderPath('Programs')) 'Custom Chess.lnk'
foreach ($l in (Join-Path ([Environment]::GetFolderPath('Desktop')) 'Custom Chess.lnk'), $menu) {
  $s = $sh.CreateShortcut($l)
  $s.TargetPath = "$dest\Custom Chess.exe"; $s.WorkingDirectory = $dest; $s.IconLocation = "$dest\CustomChess.ico,0"
  $s.Description = 'Custom Chess : échecs avec le vrai Stockfish'
  $s.Save()
}
"Installé dans $dest"
