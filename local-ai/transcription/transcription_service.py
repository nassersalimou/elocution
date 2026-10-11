"""
Service orchestrateur de transcription et d'analyse vocale locale.
Exécute une seule tâche à la fois (maxConcurrentJobs = 1).
"""
import os
import threading
from transcription.whisper_engine import whisper_engine
from analysis.speech_metrics import calculate_speech_metrics
from analysis.silence_analyzer import analyze_silences
from analysis.hesitation_analyzer import analyze_hesitations
from analysis.repetition_analyzer import analyze_repetitions

_service_lock = threading.Lock()

def analyze_audio_file(audio_path: str, default_language: str = "fr"):
    """
    Transcrit le fichier audio avec Whisper local et extrait l'ensemble des métriques d'éloquence.
    Une seule transcription à la fois pour protéger la RAM.
    """
    with _service_lock:
        print("[INFO] Job started")
        try:
            model = whisper_engine.get_model()
            
            # Transcription avec timestamps mot par mot 100% locale sans dépendance réseau
            segments_generator, info = model.transcribe(
                audio_path,
                language=default_language,
                beam_size=1,
                temperature=0.0,
                word_timestamps=True,
                vad_filter=False
            )
            
            words_list = []
            segment_texts = []
            
            for segment in segments_generator:
                segment_texts.append(segment.text.strip())
                if segment.words:
                    for w in segment.words:
                        cleaned = w.word.strip()
                        if cleaned:
                            words_list.append({
                                "text": cleaned,
                                "start": round(w.start, 2),
                                "end": round(w.end, 2),
                                "confidence": round(w.probability, 2)
                            })
                            
            full_text = " ".join(segment_texts).strip()
            total_duration = round(info.duration, 2) if info and info.duration else (words_list[-1]["end"] if words_list else 0.0)
            
            # Analyse des métriques
            metrics = calculate_speech_metrics(
                word_count=len(words_list),
                total_duration_sec=total_duration
            )
            
            silence_info = analyze_silences(words_list, total_duration)
            hesitation_info = analyze_hesitations(full_text, words_list)
            repetition_info = analyze_repetitions(full_text)
            
            # Fusion des métriques pour un format unifié
            combined_metrics = {
                **metrics,
                **silence_info,
                **hesitation_info,
                **repetition_info
            }
            
            print("[INFO] Job finished")
            
            return {
                "text": full_text,
                "language": info.language if info else default_language,
                "durationSec": total_duration,
                "words": words_list,
                "metrics": combined_metrics
            }
        except Exception as err:
            print(f"[ERROR] Job failed: {str(err)}")
            raise err
