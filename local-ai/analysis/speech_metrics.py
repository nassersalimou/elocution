"""
Calcul des métriques de vitesse de parole (WPM) et durées.
"""

def calculate_speech_metrics(word_count: int, total_duration_sec: float, speech_duration_sec: float = None):
    """
    Calcule le nombre de mots, durée de parole, et débit en mots/minute.
    Catégories descriptives : lent (< 110 wpm), modéré (110 - 155 wpm), rapide (> 155 wpm).
    """
    duration = speech_duration_sec if (speech_duration_sec is not None and speech_duration_sec > 0) else total_duration_sec
    
    if duration <= 0 or word_count <= 0:
        return {
            "spokenWordCount": word_count,
            "speechDuration": round(duration, 2),
            "wordsPerMinute": 0,
            "paceCategory": "non mesuré",
            "paceLabel": "Aucun mot détecté",
        }
    
    duration_min = duration / 60.0
    wpm = int(round(word_count / duration_min))
    
    if wpm < 110:
        pace_category = "lent"
        pace_label = "Débit posé / lent (< 110 mots/min)"
    elif wpm <= 155:
        pace_category = "modéré"
        pace_label = "Débit naturel / modéré (110–155 mots/min)"
    else:
        pace_category = "rapide"
        pace_label = "Débit dynamique / rapide (> 155 mots/min)"
        
    return {
        "spokenWordCount": word_count,
        "speechDuration": round(duration, 2),
        "wordsPerMinute": wpm,
        "paceCategory": pace_category,
        "paceLabel": pace_label,
    }
