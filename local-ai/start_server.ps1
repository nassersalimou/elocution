$python = "C:\Users\couco\eloquence-ai-venv\Scripts\python.exe"
if (!(Test-Path $python)) {
    Write-Error "Environnement virtuel introuvable dans C:\Users\couco\eloquence-ai-venv"
    exit 1
}
Write-Host "[INFO] Démarrage du serveur IA vocale locale Eloquence Coach sur 127.0.0.1:8765..." -ForegroundColor Cyan
& $python "$PSScriptRoot\server.py"
