# Custom Chess — programme Windows

Le jeu dans sa propre fenêtre (Electron), avec l'icône du cavalier. Le jeu et le vrai Stockfish sont fournis par
`../windows/MoteurCustomChess.exe` (http://localhost:57613/), lancé avec Windows.

Installer ou mettre à jour (aucun téléchargement : reprend le moteur de fenêtre Electron du programme Colosses) :

    powershell -ExecutionPolicy Bypass -File echecs\desktop\installer.ps1

Installe dans `%LOCALAPPDATA%\Programs\Custom Chess`, crée les raccourcis Bureau et menu Démarrer.
Au premier lancement, les sauvegardes du site (Chrome ou Edge) sont reprises une fois.
