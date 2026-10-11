@echo off
echo ==============================================
echo Demarrage de l'application Gestion de Budget
echo ==============================================

echo Nettoyage des anciens processus...
python clean_ports.py

echo Demarrage du backend (FastAPI)...
start "Budget Backend (FastAPI)" cmd /k "cd backend && venv_win\Scripts\activate.bat && set PYTHONPATH=.&& uvicorn app.main:app --reload --reload-dir app --port 8000 --host 0.0.0.0"

echo Demarrage du frontend (Vite/React)...
start "Budget Frontend (React)" cmd /k "cd frontend && npm run dev"

echo En attente du frontend...
:wait_loop
curl -s http://localhost:5173 >nul 2>&1
if %errorlevel% neq 0 (
    timeout /t 1 /nobreak >nul
    goto wait_loop
)

echo Ouverture du navigateur...
start http://localhost:5173

echo ==============================================
echo Application lancee !
echo Vous pouvez fermer les autres fenetres de commande pour arreter l'application.
echo ==============================================
pause
