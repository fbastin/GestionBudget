#!/bin/bash

# Lancement du backend
echo "Démarrage du backend..."
BASE_DIR="$(cd "$(dirname "$0")" && pwd)"
cd "$BASE_DIR/backend"
source venv/bin/activate
export PYTHONPATH=$PYTHONPATH:.
uvicorn app.main:app --reload --port 8000 --host 127.0.0.1 &
BACKEND_PID=$!

# Lancement du frontend
echo "Démarrage du frontend..."
cd "$BASE_DIR/frontend"
npm run dev &
FRONTEND_PID=$!

echo "Application lancée !"
echo "Backend: http://127.0.0.1:8000"
echo "Frontend: http://localhost:5173"

# Attente de l"utilisateur
trap "kill $BACKEND_PID $FRONTEND_PID" EXIT
wait
