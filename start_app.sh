#!/bin/bash

# Nettoyage des anciens processus
echo "Nettoyage des anciens processus..."
python3 clean_ports.py

# Lancement du backend
echo "Démarrage du backend..."
BASE_DIR="$(cd "$(dirname "$0")" && pwd)"
cd "$BASE_DIR/backend"
source venv/bin/activate
export PYTHONPATH=$PYTHONPATH:.
uvicorn app.main:app --reload --reload-dir app --port 8000 --host 0.0.0.0 &
BACKEND_PID=$!

# Lancement du frontend
echo "Démarrage du frontend..."
cd "$BASE_DIR/frontend"
npm run dev &
FRONTEND_PID=$!

echo "Application lancée !"
echo "Backend: http://127.0.0.1:8000"
echo "Frontend: http://localhost:5173"

# Ouverture automatique du navigateur dès que le frontend est prêt
(
  echo "En attente du frontend..."
  until curl -s http://localhost:5173 > /dev/null 2>&1; do
    sleep 1
  done
  echo "Ouverture du navigateur..."
  cmd.exe /c start http://localhost:5173 2>/dev/null || xdg-open http://localhost:5173 2>/dev/null
) &

# Attente de l"utilisateur
trap "kill $BACKEND_PID $FRONTEND_PID" EXIT
wait
