"""
Serveur FastAPI local pour l'analyse vocale 100% hors-ligne (127.0.0.1:8765).
Protège la RAM en n'exécutant qu'une transcription à la fois.
"""
import os
import sys
import asyncio
import shutil
import tempfile
from fastapi import FastAPI, File, UploadFile, HTTPException
from fastapi.middleware.cors import CORSMiddleware

# Assurer que le répertoire parent est dans sys.path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from transcription.whisper_engine import whisper_engine
from transcription.transcription_service import analyze_audio_file
from coach.gemini_coach import coach_router, is_coach_available
from coach.tts import tts_router  # après gemini_coach, qui charge le .env
from access_guard import install_guard

app = FastAPI(title="&locution - Local Voice AI", version="1.0.0")

install_guard(app)

allowed_origins_env = os.getenv("ALLOWED_ORIGINS", "*")
allow_origins = [o.strip() for o in allowed_origins_env.split(",") if o.strip()]

app.add_middleware(
    CORSMiddleware,
    allow_origins=allow_origins,
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(coach_router)
app.include_router(tts_router)

@app.get("/health")
def health():
    return {
        "status": "ok",
        "model": "base",
        "loaded": whisper_engine.is_loaded,
        "device": "cpu",
        "computeType": "int8"
    }

@app.get("/capabilities")
def capabilities():
    caps = {
        "transcription": True,
        "wpm": True,
        "hesitations": True,
        "silences": True,
        "repetitions": True,
        "firstSpeechDelay": True,
        "privacy": "100% local, aucun envoi cloud"
    }
    if is_coach_available():
        caps["coach"] = True
    return caps

@app.post("/unload")
def unload():
    success = whisper_engine.unload_model()
    return {"status": "unloaded" if success else "already_unloaded"}

def to_plain(obj):
    if isinstance(obj, dict):
        return {to_plain(k): to_plain(v) for k, v in obj.items()}
    if isinstance(obj, list):
        return [to_plain(item) for item in obj]
    if isinstance(obj, tuple):
        return tuple(to_plain(item) for item in obj)
    if hasattr(obj, "item") and callable(getattr(obj, "item")):
        try:
            return obj.item()
        except (ValueError, TypeError):
            pass
    if hasattr(obj, "tolist") and callable(getattr(obj, "tolist")):
        return to_plain(obj.tolist())
    return obj

@app.post("/analyze")
async def analyze(file: UploadFile = File(...)):
    """
    Reçoit un fichier audio (WebM, WAV, MP3, etc.), effectue la transcription et l'analyse vocale.
    Supprime immédiatement le fichier temporaire après analyse.
    """
    suffix = os.path.splitext(file.filename or "")[1] or ".webm"
    temp_file = tempfile.NamedTemporaryFile(delete=False, suffix=suffix)
    temp_path = temp_file.name
    temp_file.close()

    try:
        with open(temp_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)

        # Whisper dans un thread : sinon il bloque tout le serveur (coach compris)
        # pendant la transcription, qui prend ~30 s sur un petit processeur.
        result = await asyncio.to_thread(analyze_audio_file, temp_path)
        return to_plain(result)
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Échec de l'analyse vocale : {str(exc)}")
    finally:
        if os.path.exists(temp_path):
            try:
                os.remove(temp_path)
            except Exception:
                pass

if __name__ == "__main__":
    import uvicorn
    host = os.getenv("HOST", "127.0.0.1")
    port = int(os.getenv("PORT", "8765"))
    uvicorn.run(app, host=host, port=port, log_level="warning")
