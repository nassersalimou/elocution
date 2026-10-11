"""
Analyse des hésitations et tics de langage détectés dans la transcription.
"""
import re
from typing import List, Dict, Any

FRENCH_FILLERS = [
    r"\beuh+\b",
    r"\bheu+\b",
    r"\bhum+\b",
    r"\bhmm+\b",
    r"\bben\b",
    r"\bbah\b",
    r"\bouais\b",
    r"\bdu coup\b",
    r"\ben fait\b",
    r"\bgenre\b",
]

COMPILED_FILLERS = [re.compile(pattern, re.IGNORECASE) for pattern in FRENCH_FILLERS]

def analyze_hesitations(text: str, words: List[Dict[str, Any]] = None):
    """
    Détecte les hésitations et mots de remplissage dans le texte transcrit.
    Ne prétend pas être une analyse acoustique brute, mais une détection textuelle honnête.
    """
    if not text:
        return {
            "fillerWordsCount": 0,
            "fillerWords": [],
            "occurrences": []
        }
    
    found_occurrences = []
    found_counts = {}
    
    for regex in COMPILED_FILLERS:
        for match in regex.finditer(text):
            word = match.group(0).lower()
            found_counts[word] = found_counts.get(word, 0) + 1
            found_occurrences.append({
                "word": word,
                "startChar": match.start(),
                "endChar": match.end()
            })
            
    # Détection directe dans les tokens de mots si disponibles
    if words:
        for w in words:
            w_text = w.get("text", "").strip().lower()
            if w_text in ["euh", "heu", "hum", "hmm", "bah", "ben"] and not any(o["word"] == w_text for o in found_occurrences):
                found_counts[w_text] = found_counts.get(w_text, 0) + 1
                found_occurrences.append({
                    "word": w_text,
                    "timestamp": w.get("start")
                })
                
    total_count = sum(found_counts.values())
    summary_list = [f"{word} (x{count})" if count > 1 else word for word, count in sorted(found_counts.items(), key=lambda x: -x[1])]
    
    return {
        "fillerWordsCount": total_count,
        "fillerWords": summary_list,
        "rawCounts": found_counts
    }
