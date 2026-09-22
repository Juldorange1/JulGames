@echo off
REM Lance un petit serveur local pour Puissance 4 et ouvre le jeu dans le navigateur.
REM Necessaire car le livre d'ouverture (33 Mo) ne peut pas se charger si on ouvre
REM index.html directement (double-clic) : les navigateurs bloquent ce type de
REM chargement pour les fichiers ouverts sans serveur, par securite.
cd /d "%~dp0"
start "Serveur Puissance 4 (laisser cette fenetre ouverte)" /min cmd /c "python -m http.server 5575"
timeout /t 2 /nobreak >nul
start "" http://localhost:5575
