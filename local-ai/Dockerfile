FROM python:3.11-slim

RUN apt-get update && \
    apt-get install -y --no-install-recommends ffmpeg && \
    rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY requirements.txt .
# ctranslate2 est fige en 3.24 pour Windows ; sous Linux on laisse faster-whisper choisir
RUN grep -v '^ctranslate2' requirements.txt > requirements-docker.txt && \
    pip install --no-cache-dir -r requirements-docker.txt

COPY . .

# PrÃ©-tÃ©lÃ©charger le modÃ¨le Whisper base au build pour Ã©viter un dÃ©marrage lent
RUN python -c "from faster_whisper import WhisperModel; WhisperModel('base', device='cpu', compute_type='int8')"

ENV ELOCUTION_DATA_DIR=/tmp/elocution PYTHONUNBUFFERED=1

CMD exec uvicorn server:app --host 0.0.0.0 --port ${PORT:-8080}
