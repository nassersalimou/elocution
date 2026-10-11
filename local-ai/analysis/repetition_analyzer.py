"""
Analyse des répétitions de mots simples et tics répétitifs.
"""
import re
from typing import List, Dict, Any

# Mots d'arrêt français ignorés pour l'analyse des répétitions de fond
FRENCH_STOPWORDS = {
    "le", "la", "les", "un", "une", "des", "du", "de", "d", "l",
    "et", "ou", "a", "au", "aux", "en", "dans", "par", "pour", "sur",
    "que", "qui", "quoi", "dont", "ce", "cet", "cette", "ces", "se", "sa", "son", "ses"
}

IMMEDIATE_REPETITION_REGEX = re.compile(r"\b([a-zA-Zà-ÿÀ-Ý]{2,})\s+\1\b", re.IGNORECASE)

def analyze_repetitions(text: str):
    """
    Détecte :
    1. Les bégaiements / répétitions immédiates (« je je », « donc donc »)
    2. Les répétitions fréquentes de mots significatifs (> 3 lettres)
    """
    if not text:
        return {
            "repetitionsCount": 0,
            "immediateRepetitions": [],
            "repeatedWords": []
        }
        
    # 1. Répétitions immédiates
    immediate = []
    for match in IMMEDIATE_REPETITION_REGEX.finditer(text):
        repeated_word = match.group(1).lower()
        immediate.append(f"{repeated_word} {repeated_word}")
        
    # 2. Mots répétés fréquemment
    words = re.findall(r"\b[a-zA-Zà-ÿÀ-Ý]{3,}\b", text.lower())
    counts = {}
    for w in words:
        if w not in FRENCH_STOPWORDS:
            counts[w] = counts.get(w, 0) + 1
            
    # Mots apparaissant 3 fois ou plus
    frequent = [f"{w} (x{c})" for w, c in sorted(counts.items(), key=lambda x: -x[1]) if c >= 3]
    
    total_reps = len(immediate) + len(frequent)
    
    return {
        "repetitionsCount": total_reps,
        "immediateRepetitions": immediate,
        "repeatedWords": frequent
    }
