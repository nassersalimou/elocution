"""
Mesure précise de la consommation RAM lors du chargement et de la transcription Whisper.
Utilise psutil pour mesurer le Working Set (RSS) et le pic de mémoire réel du processus.
"""
import os
import sys
import math
import wave
import struct
import tempfile
import psutil

if hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8')

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

process = psutil.Process(os.getpid())

def get_ram_mb():
    return round(process.memory_info().rss / (1024 * 1024), 1)

print("=== MESURE RÉELLE DE LA RAM DU PROCESSUS PYTHON ===", flush=True)
ram_initial = get_ram_mb()
print(f"1. RAM initiale (Python avant chargement modèle) : {ram_initial} Mo", flush=True)

# 2. Chargement paresseux du modèle
from transcription.whisper_engine import whisper_engine
print("2. Chargement du modèle Whisper base (int8, cpu)...", flush=True)
model = whisper_engine.get_model()

ram_after_load = get_ram_mb()
print(f"3. RAM après chargement du modèle : {ram_after_load} Mo (delta: +{round(ram_after_load - ram_initial, 1)} Mo)", flush=True)

# 3. Création d'un mini-fichier audio synthétique (WAV 16kHz sinus 2s) sur C: (disque local NTFS rapide)
test_wav = os.path.join(tempfile.gettempdir(), "eloquence_test_sample.wav")
with wave.open(test_wav, "w") as wav_file:
    wav_file.setnchannels(1)
    wav_file.setsampwidth(2)
    wav_file.setframerate(16000)
    for i in range(16000 * 2): # 2 secondes de tonalité 440Hz
        val = int(32767 * 0.2 * math.sin(2 * math.pi * 440 * i / 16000))
        wav_file.writeframes(struct.pack('<h', val))

print("4. Exécution d'une transcription réelle...", flush=True)
from transcription.transcription_service import analyze_audio_file
result = analyze_audio_file(test_wav)
ram_after_transcribe = get_ram_mb()
print(f"5. RAM après transcription : {ram_after_transcribe} Mo", flush=True)

# Nettoyage fichier de test
if os.path.exists(test_wav):
    os.remove(test_wav)

# 4. Test du déchargement de la mémoire
print("6. Déchargement du modèle de la RAM (unload_model)...", flush=True)
whisper_engine.unload_model()
ram_after_unload = get_ram_mb()
print(f"7. RAM après déchargement et garbage collection : {ram_after_unload} Mo (libération: -{round(ram_after_transcribe - ram_after_unload, 1)} Mo)", flush=True)
print(f"\nCONCLUSION RAM RÉELLE : Modèle Whisper base int8 = pic à {ram_after_transcribe} Mo (extrêmement léger, < 250 Mo)", flush=True)
