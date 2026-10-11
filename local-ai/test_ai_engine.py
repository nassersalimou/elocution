"""
Suite de tests unitaires pour le moteur IA vocal local.
"""
import os
import sys

# Ajouter le dossier local-ai au path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
if hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8')

from analysis.speech_metrics import calculate_speech_metrics
from analysis.silence_analyzer import analyze_silences
from analysis.hesitation_analyzer import analyze_hesitations
from analysis.repetition_analyzer import analyze_repetitions
from transcription.whisper_engine import whisper_engine

passed = 0
failed = 0

def test(name, fn):
    global passed, failed
    try:
        fn()
        print(f"  ✓ {name}")
        passed += 1
    except Exception as e:
        print(f"  ✗ {name}: {str(e)}")
        failed += 1

print("\n--- 1. Tests Speech Metrics (Débit WPM) ---")

def test_wpm_normal():
    # 138 mots en 60 secondes -> 138 WPM (modéré)
    res = calculate_speech_metrics(138, 60.0)
    assert res["wordsPerMinute"] == 138
    assert res["paceCategory"] == "modéré"

def test_wpm_slow():
    # 70 mots en 60 secondes -> 70 WPM (lent)
    res = calculate_speech_metrics(70, 60.0)
    assert res["wordsPerMinute"] == 70
    assert res["paceCategory"] == "lent"

def test_wpm_fast():
    # 180 mots en 60 secondes -> 180 WPM (rapide)
    res = calculate_speech_metrics(180, 60.0)
    assert res["wordsPerMinute"] == 180
    assert res["paceCategory"] == "rapide"

test("Débit modéré 138 mots/min", test_wpm_normal)
test("Débit lent < 110 mots/min", test_wpm_slow)
test("Débit rapide > 155 mots/min", test_wpm_fast)

print("\n--- 2. Tests Silences & Démarrage ---")

def test_silence_analysis():
    words = [
        {"text": "bonjour", "start": 1.4, "end": 1.9},
        {"text": "à", "start": 2.1, "end": 2.2},
        {"text": "tous", "start": 3.5, "end": 3.8}, # gap 1.3s -> pause longue
    ]
    res = analyze_silences(words, 5.0)
    assert res["firstSpeechDelay"] == 1.4, f"Attendu 1.4, reçu {res['firstSpeechDelay']}"
    assert res["longPauseCount"] >= 1, "Doit détecter au moins 1 pause longue"
    assert res["longestPauseSec"] >= 1.2

test("Détection firstSpeechDelay et pauses longues", test_silence_analysis)

print("\n--- 3. Tests Hésitations (Filler Words) ---")

def test_hesitations():
    text = "Euh je pense que heu nous devrions ben commencer."
    res = analyze_hesitations(text)
    assert res["fillerWordsCount"] == 3
    assert any("euh" in f for f in res["fillerWords"])
    assert any("heu" in f for f in res["fillerWords"])

test("Détection fidèle des hésitations françaises", test_hesitations)

print("\n--- 4. Tests Répétitions ---")

def test_repetitions():
    text = "Je je crois donc donc que l'argument est solide."
    res = analyze_repetitions(text)
    assert len(res["immediateRepetitions"]) == 2
    assert "je je" in res["immediateRepetitions"]
    assert "donc donc" in res["immediateRepetitions"]

test("Détection des bégaiements immédiats", test_repetitions)

print("\n--- 5. Tests WhisperEngine Lifecycle ---")

def test_whisper_lifecycle():
    # Modèle initialement non chargé (protection RAM)
    assert not whisper_engine.is_loaded
    # Déchargement alors que non chargé -> false
    assert whisper_engine.unload_model() is False

test("Cycle de vie paresseux (lazy loading) et protection RAM", test_whisper_lifecycle)

print(f"\n========================================")
print(f"Résultats tests Python : {passed} passés, {failed} échoués")
print(f"========================================\n")

if failed > 0:
    sys.exit(1)
