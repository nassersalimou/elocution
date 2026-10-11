"""
Analyse des silences, délais de démarrage et pauses longues.
"""
from typing import List, Dict, Any

def analyze_silences(words: List[Dict[str, Any]], total_duration: float):
    """
    Analyse les silences à partir des timestamps des mots ou segments.
    - firstSpeechDelay : temps avant le premier mot.
    - pause courte : 0.4s à 1.0s
    - pause longue : > 1.0s
    """
    if not words or total_duration <= 0:
        return {
            "firstSpeechDelay": 0.0,
            "silenceCount": 0,
            "longPauseCount": 0,
            "longestPauseSec": 0.0,
            "totalSilenceSec": round(total_duration, 2),
            "pauses": []
        }
    
    first_speech_delay = round(max(0.0, words[0].get("start", 0.0)), 2)
    
    pauses = []
    prev_end = words[0].get("end", 0.0)
    
    for i in range(1, len(words)):
        curr_start = words[i].get("start", prev_end)
        gap = round(curr_start - prev_end, 2)
        if gap >= 0.4:
            pauses.append({
                "start": round(prev_end, 2),
                "end": round(curr_start, 2),
                "duration": gap,
                "isLong": gap > 1.0
            })
        prev_end = max(prev_end, words[i].get("end", curr_start))
        
    # Silence final optionnel
    final_silence = max(0.0, total_duration - prev_end)
    if final_silence >= 1.0:
        pauses.append({
            "start": round(prev_end, 2),
            "end": round(total_duration, 2),
            "duration": round(final_silence, 2),
            "isLong": True
        })
        
    long_pauses = [p for p in pauses if p["isLong"]]
    longest_pause = max([p["duration"] for p in pauses], default=0.0)
    total_silence = round(first_speech_delay + sum(p["duration"] for p in pauses), 2)
    
    return {
        "firstSpeechDelay": first_speech_delay,
        "silenceCount": len(pauses),
        "longPauseCount": len(long_pauses),
        "longestPauseSec": round(longest_pause, 2),
        "totalSilenceSec": round(total_silence, 2),
        "pauses": pauses[:15]  # limiter la taille du JSON de retour
    }
