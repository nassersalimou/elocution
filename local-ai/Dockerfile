FROM python:3.11-slim

RUN apt-get update && \
    apt-get install -y --no-install-recommends ffmpeg && \
    rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

# Pré-télécharger le modèle Whisper base au build pour éviter un démarrage lent
RUN python -c "from faster_whisper import WhisperModel; WhisperModel('base', device='cpu', compute_type='int8')"

ENV ELOCUTION_DATA_DIR=/tmp/elocution PYTHONUNBUFFERED=1

CMD exec uvicorn server:app --host 0.0.0.0 --port ${PORT:-8080}
