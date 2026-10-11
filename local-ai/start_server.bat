@echo off
set VENV_PYTHON=C:\Users\couco\eloquence-ai-venv\Scripts\python.exe
if not exist "%VENV_PYTHON%" (
    echo [ERREUR] Environnement virtuel introuvable dans C:\Users\couco\eloquence-ai-venv
    pause
    exit /b 1
)
echo [INFO] Demarrage du serveur IA vocale locale Eloquence Coach sur 127.0.0.1:8765...
"%VENV_PYTHON%" "%~dp0server.py"
