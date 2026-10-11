"""Voix HD Google (Chirp 3 HD) avec cache disque et garde-fou du quota gratuit.

- Payé par My First Project, mais Chirp 3 HD offre 1 million de caractères gratuits par mois :
  on s'arrête à TTS_MONTHLY_LIMIT (900 000 par défaut) pour ne jamais dépasser le gratuit.
- Chaque texte déjà lu est servi depuis le cache (0 caractère consommé).
- En cas de refus (quota, réseau), le front retombe sur la voix du navigateur.
"""
import base64
import hashlib
import json
import os
import threading
import time
from typing import Literal

import google.auth
import requests
from fastapi import APIRouter, HTTPException
from fastapi.responses import Response
from google.auth.transport.requests import Request as AuthRequest
from pydantic import BaseModel, Field

TTS_PROJECT = os.getenv("TTS_PROJECT") or os.getenv("VERTEX_PROJECT") or ""
TTS_MONTHLY_LIMIT = int(os.getenv("TTS_MONTHLY_LIMIT", "900000"))
VOICES = {
    "female": os.getenv("TTS_VOICE_FEMALE", "fr-FR-Chirp3-HD-Aoede"),
    "male": os.getenv("TTS_VOICE_MALE", "fr-FR-Chirp3-HD-Charon"),
}
# Cache hors Google Drive : inutile de synchroniser des milliers de mp3.
_BASE_DATA_DIR = os.getenv("ELOCUTION_DATA_DIR") or os.path.join(os.getenv("LOCALAPPDATA") or os.path.expanduser("~"), "elocution")
CACHE_DIR = os.path.join(_BASE_DATA_DIR, "tts_cache")
USAGE_FILE = os.path.join(CACHE_DIR, "usage.json")

_lock = threading.Lock()
_credentials = None

tts_router = APIRouter(prefix="/coach", tags=["tts"])


class TtsRequest(BaseModel):
    text: str = Field(..., min_length=1, max_length=1500)
    gender: Literal["female", "male"] = "female"
    rate: float = Field(0.92, ge=0.6, le=1.4)


def _token() -> str:
    global _credentials
    if _credentials is None:
        _credentials, _ = google.auth.default(scopes=["https://www.googleapis.com/auth/cloud-platform"])
    if not _credentials.valid:
        _credentials.refresh(AuthRequest())
    return _credentials.token


def _read_usage() -> dict:
    month = time.strftime("%Y-%m")
    try:
        with open(USAGE_FILE, encoding="utf-8") as f:
            usage = json.load(f)
        if usage.get("month") == month:
            return usage
    except Exception:
        pass
    return {"month": month, "chars": 0}


def get_tts_usage() -> dict:
    usage = _read_usage()
    return {**usage, "limit": TTS_MONTHLY_LIMIT}


def synthesize(text: str, gender: str, rate: float) -> bytes:
    voice = VOICES[gender]
    rate = round(rate, 2)
    key = hashlib.sha256(f"{voice}|{rate}|{text}".encode("utf-8")).hexdigest()
    path = os.path.join(CACHE_DIR, f"{key}.mp3")
    if os.path.exists(path):
        with open(path, "rb") as f:
            return f.read()

    if not TTS_PROJECT:
        raise HTTPException(status_code=503, detail="Voix HD non configurée (TTS_PROJECT)")

    with _lock:
        usage = _read_usage()
        if usage["chars"] + len(text) > TTS_MONTHLY_LIMIT:
            raise HTTPException(status_code=429, detail="Quota gratuit mensuel de la voix HD presque atteint")
        usage["chars"] += len(text)
        os.makedirs(CACHE_DIR, exist_ok=True)
        with open(USAGE_FILE, "w", encoding="utf-8") as f:
            json.dump(usage, f)

    res = requests.post(
        "https://texttospeech.googleapis.com/v1/text:synthesize",
        headers={"Authorization": f"Bearer {_token()}", "x-goog-user-project": TTS_PROJECT},
        json={
            "input": {"text": text},
            "voice": {"languageCode": "fr-FR", "name": voice},
            "audioConfig": {"audioEncoding": "MP3", "speakingRate": rate},
        },
        timeout=30,
    )
    if res.status_code != 200:
        raise HTTPException(status_code=502, detail=f"Voix HD indisponible ({res.status_code})")
    audio = base64.b64decode(res.json()["audioContent"])
    with open(path, "wb") as f:
        f.write(audio)
    return audio


@tts_router.post("/tts")
def tts(req: TtsRequest) -> Response:
    # Route synchrone : FastAPI l'exécute dans un thread, l'appel réseau ne bloque pas le serveur.
    audio = synthesize(req.text.strip(), req.gender, req.rate)
    return Response(content=audio, media_type="audio/mpeg")


@tts_router.get("/tts/usage")
def tts_usage() -> dict:
    return get_tts_usage()
