import os
import sys
import json
import time
import asyncio
import subprocess
import tempfile
import shutil
from typing import Optional, List, Dict, Any, Literal
from fastapi import APIRouter, HTTPException, UploadFile, File, Form
from pydantic import BaseModel, Field
from dotenv import load_dotenv
from google import genai
from google.genai import types
from google.genai.models import Models

# Désactiver l'avertissement interne AFC du SDK
Models._logged_afc_warning = True

# Charger .env depuis local-ai/.env ou l'environnement
_env_path = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), ".env")
if os.path.exists(_env_path):
    load_dotenv(_env_path)
else:
    load_dotenv()

DEFAULT_MODELS = "gemini-3.8-flash,gemini-3.7-flash,gemini-3.5-flash-lite,gemini-3.1-flash-lite,gemma-4-31b-it"
VERTEX_PROJECT = os.getenv("VERTEX_PROJECT", "")
VERTEX_LOCATION = os.getenv("VERTEX_LOCATION", "global")
VERTEX_MODELS = os.getenv("VERTEX_MODELS", "gemini-3.8-flash,gemini-3.7-flash")
VERTEX_PRO_MODELS = os.getenv("VERTEX_PRO_MODELS", "gemini-3.1-pro-preview,gemini-2.5-pro")

# Dictionnaire mémoire : "source:modele" -> date (timestamp) jusqu'à laquelle on l'évite.
# Quota épuisé : 1 h ; modèle lent ou surchargé (504, délai) : 10 min.
_exhausted_models: Dict[str, float] = {}

def get_configured_models() -> List[str]:
    raw = os.getenv("GEMINI_MODELS") or os.getenv("GEMINI_MODEL") or DEFAULT_MODELS
    return [m.strip() for m in raw.split(",") if m.strip()]

def get_vertex_models() -> List[str]:
    raw = os.getenv("VERTEX_MODELS", "gemini-3.8-flash,gemini-3.7-flash")
    return [m.strip() for m in raw.split(",") if m.strip()]

def get_vertex_pro_models() -> List[str]:
    raw = os.getenv("VERTEX_PRO_MODELS", "gemini-3.1-pro-preview,gemini-2.5-pro")
    return [m.strip() for m in raw.split(",") if m.strip()]

def get_exhausted_models() -> List[str]:
    now = time.time()
    expired = [k for k, until in _exhausted_models.items() if now >= until]
    for k in expired:
        del _exhausted_models[k]
    return list(_exhausted_models.keys())

def is_model_exhausted(model_key: str) -> bool:
    until = _exhausted_models.get(model_key)
    if until is None:
        return False
    if time.time() < until:
        return True
    del _exhausted_models[model_key]
    return False

def mark_model_exhausted(model_key: str, seconds: int = 3600):
    _exhausted_models[model_key] = time.time() + seconds

# Clients genai créés paresseusement
_client: Optional[genai.Client] = None
_vertex_client: Optional[genai.Client] = None

def get_api_key() -> str:
    return (os.getenv("GEMINI_API_KEY") or "").strip()

def is_coach_available() -> bool:
    project = (os.getenv("VERTEX_PROJECT", "") or VERTEX_PROJECT).strip()
    return bool(get_api_key()) or bool(project)

def get_client() -> Optional[genai.Client]:
    global _client
    api_key = get_api_key()
    if not api_key:
        return None
    if _client is None:
        try:
            http_opts = types.HttpOptions(retry_options=types.HttpRetryOptions(attempts=1))
            _client = genai.Client(api_key=api_key, http_options=http_opts)
        except Exception:
            _client = genai.Client(api_key=api_key)
    return _client

def get_vertex_client() -> Optional[genai.Client]:
    global _vertex_client
    project = (os.getenv("VERTEX_PROJECT", "") or VERTEX_PROJECT).strip()
    if not project:
        return None
    if _vertex_client is None:
        location = (os.getenv("VERTEX_LOCATION", "global") or VERTEX_LOCATION).strip()
        try:
            http_opts = types.HttpOptions(retry_options=types.HttpRetryOptions(attempts=1))
            _vertex_client = genai.Client(
                vertexai=True,
                project=project,
                location=location,
                http_options=http_opts,
            )
        except Exception:
            _vertex_client = genai.Client(
                vertexai=True,
                project=project,
                location=location,
            )
    return _vertex_client

THEME_ROLES = {
    "debat": "un contradicteur de débat public qui attaque la logique et les preuves",
    "entretien": "un recruteur exigeant qui relance sur les exemples concrets, les résultats et la cohérence du parcours",
    "quotidien": "un ami ou collègue sceptique dans une conversation de tous les jours",
    "convaincre": "un interlocuteur difficile à convaincre qui pointe les failles et demande des bénéfices concrets",
    "defendre": "un opposant qui défend l'opinion inverse avec conviction",
    "improvisation": "un interlocuteur imprévisible qui change d'angle et introduit des rebondissements",
    "personnel": "un interlocuteur bienveillant mais curieux qui pousse à aller plus loin dans la réflexion personnelle",
    "culture": "un examinateur de culture générale qui vérifie l'exactitude des faits et demande des références",
    "professionnel": "un manager ou client qui exige de la précision, des chiffres et des solutions",
    "pitch": "un investisseur pressé qui challenge la valeur, le marché et la crédibilité",
}

DIFFICULTY_STYLES = {
    "debutant": "Sois encourageant, une seule objection simple et claire, phrases courtes.",
    "normal": "Objections nettes et argumentées, ton ferme mais cordial.",
    "difficile": "Objections précises, relève les contradictions et les généralisations, exige des exemples.",
    "intense": "Pression maximale : attaque le point le plus faible, exige chiffres et preuves, ne laisse rien passer, reste respectueux.",
}

def context_instruction(theme: str = "", difficulty: str = "") -> str:
    role = THEME_ROLES.get((theme or "").strip().lower(), "")
    style = DIFFICULTY_STYLES.get((difficulty or "").strip().lower(), "")
    parts = []
    if role:
        parts.append(f"tu joues {role}.")
    if style:
        parts.append(style)
    if not parts:
        return ""
    return f"Contexte : {' '.join(parts)}"

SYSTEM_BASE = (
    "Tu es un coach en éloquence et prise de parole en public bienveillant mais exigeant. "
    "Toutes tes réponses doivent être en français, avec le tutoiement. "
    "PRINCIPE PÉDAGOGIQUE ESSENTIEL : Le but est que l'utilisateur progresse à l'oral. "
    "Commence toujours par la critique et la question ; les exemples de meilleures formulations viennent APRÈS, pour montrer concrètement comment progresser. "
    "Toujours : 1 point fort précis et justifié, 1 faiblesse principale argumentée (pourquoi elle affaiblit le propos), "
    "1 question qui force à creuser. "
    "Être exigeant mais bienveillant, concret, court. "
    "Tu réponds STRICTEMENT au format JSON demandé."
)

_BASE_DATA_DIR = os.getenv("ELOCUTION_DATA_DIR") or os.path.join(os.getenv("LOCALAPPDATA") or os.path.expanduser("~"), "elocution")
COACH_LOG = os.path.join(_BASE_DATA_DIR, "coach_calls.log")


def log_call(model_key: str, bilan: bool, seconds: float, outcome: str):
    """Journal des appels IA (durée, modèle, erreur) pour diagnostiquer les lenteurs."""
    line = f"{time.strftime('%Y-%m-%d %H:%M:%S')} | {'bilan ' if bilan else 'normal'} | {model_key} | {seconds:5.1f}s | {outcome}"
    print(line, flush=True)
    try:
        os.makedirs(os.path.dirname(COACH_LOG), exist_ok=True)
        with open(COACH_LOG, "a", encoding="utf-8") as f:
            f.write(line + "\n")
    except Exception:
        pass


def call_gemini(
    prompt: str,
    system_extra: str = "",
    bilan: bool = False,
    parts: Optional[List[types.Part]] = None,
    rapide: bool = False,
) -> tuple[dict, str]:
    """rapide=True : échange en direct (réplique, tour de duel, transcription) → Vertex Flash
    d'abord (≈0,1 centime de crédit, vitesse régulière), car les modèles gratuits sont
    souvent saturés (504 après 14 s mesuré) ; le gratuit reste en secours."""
    client_cle = get_client()
    client_vertex = get_vertex_client()

    raw_attempts: List[tuple[str, Optional[genai.Client], str]] = []
    if bilan:
        for m in get_vertex_pro_models():
            raw_attempts.append(("vertex-pro", client_vertex, m))
    free = [("gratuit", client_cle, m) for m in get_configured_models()]
    paid_flash = [("vertex", client_vertex, m) for m in get_vertex_models()]
    raw_attempts += (paid_flash + free) if rapide else (free + paid_flash)

    attempts = [(source, client, model) for source, client, model in raw_attempts if client is not None]

    if not attempts:
        raise HTTPException(
            status_code=503,
            detail="Coach IA indisponible (aucune source configurée : clé API ou Vertex AI)"
        )

    sys_instruction = SYSTEM_BASE
    if system_extra:
        sys_instruction += "\n\n" + system_extra

    config_params: Dict[str, Any] = {
        "system_instruction": sys_instruction,
        "response_mime_type": "application/json",
        "temperature": 0.7,
        # La réflexion interne du Pro est décomptée de cette limite : à 4096 le JSON
        # des bilans pouvait être tronqué (illisible -> modèle suivant -> +20 s).
        "max_output_tokens": 8192 if bilan else 2048,
    }
    # Délai max PAR modèle : sans lui, un modèle preview surchargé pouvait bloquer
    # au-delà des 45-90 s du front (« Le coach met trop de temps à répondre »).
    attempt_timeout_s = 40 if bilan else 15
    try:
        config_params["http_options"] = types.HttpOptions(
            retry_options=types.HttpRetryOptions(attempts=1),
            timeout=attempt_timeout_s * 1000,
        )
    except Exception:
        pass

    config = types.GenerateContentConfig(**config_params)
    # Échanges courts : sans réflexion interne, ~3x plus rapide (11 s -> 4 s mesuré).
    # Les bilans gardent la réflexion complète pour la qualité.
    fast_config = None
    if not bilan:
        try:
            fast_config = types.GenerateContentConfig(
                **config_params, thinking_config=types.ThinkingConfig(thinking_budget=0)
            )
        except Exception:
            fast_config = None

    had_quota_exhausted = False
    last_error_msg = ""
    contents = [*parts, prompt] if parts else prompt

    started = time.time()
    total_budget_s = 75 if bilan else 30
    for source, client, model_name in attempts:
        model_key = f"{source}:{model_name}"
        if time.time() - started > total_budget_s:
            log_call(model_key, bilan, 0, "ABANDON budget total dépassé")
            break
        if is_model_exhausted(model_key):
            had_quota_exhausted = True
            continue

        t0 = time.time()
        try:
            response = None
            if fast_config is not None:
                try:
                    response = client.models.generate_content(
                        model=model_name, contents=contents, config=fast_config,
                    )
                except Exception as exc:
                    # Modèle qui refuse le réglage de réflexion (« thinking… » ou
                    # 400 INVALID_ARGUMENT sans détail, vu sur flash-lite) : on réessaie sans.
                    msg = str(exc)
                    if "hinking" not in msg and "INVALID_ARGUMENT" not in msg:
                        raise
            if response is None:
                response = client.models.generate_content(
                    model=model_name,
                    contents=contents,
                    config=config,
                )
            raw_text = (response.text or "").strip()
            if raw_text.startswith("```json"):
                raw_text = raw_text[7:]
            if raw_text.startswith("```"):
                raw_text = raw_text[3:]
            if raw_text.endswith("```"):
                raw_text = raw_text[:-3]
            parsed = json.loads(raw_text.strip())
            log_call(model_key, bilan, time.time() - t0, "ok")
            return parsed, model_key
        except HTTPException:
            raise
        except Exception as exc:
            err_msg = str(exc)
            last_error_msg = err_msg
            log_call(model_key, bilan, time.time() - t0, f"ERREUR {type(exc).__name__}: {err_msg[:160]}")
            if "429" in err_msg or "RESOURCE_EXHAUSTED" in err_msg:
                mark_model_exhausted(model_key)
                had_quota_exhausted = True
                continue
            elif any(s in err_msg for s in ("503", "UNAVAILABLE", "504", "DEADLINE_EXCEEDED", "imed out", "imeout")):
                # Modèle saturé ou trop lent : on l'évite 10 min au lieu de reperdre 14 s à chaque appel.
                mark_model_exhausted(model_key, 600)
                continue
            else:
                continue

    if had_quota_exhausted:
        raise HTTPException(
            status_code=429,
            detail=f"Tous les modèles ont échoué (quota épuisé) : {last_error_msg}"
        )
    raise HTTPException(
        status_code=502,
        detail=f"Tous les modèles ont échoué : {last_error_msg or 'Erreur passerelle'}"
    )

# Modèles Pydantic pour validation des entrées (limite à 6000 caractères)
class FeedbackRequest(BaseModel):
    game: Literal["debate", "clarity", "mirror", "vocabulary"]
    subject: str = Field(..., max_length=6000)
    transcript: str = Field(..., max_length=6000)
    metrics: Optional[Dict[str, Any]] = None
    attempt: int = 1
    wantModel: bool = False
    theme: str = Field(default="", max_length=100)
    difficulty: str = Field(default="", max_length=100)

class TopicCheckRequest(BaseModel):
    input: str = Field(..., max_length=6000)
    profile: str = Field(default="", max_length=6000)

class TopicSuggestRequest(BaseModel):
    category: Literal["liked", "disliked", "test"]
    profile: str = Field(default="", max_length=6000)
    avoid: List[str] = Field(default_factory=list)

class HistoryItem(BaseModel):
    role: Literal["user", "ai"]
    text: str = Field(..., max_length=6000)

class RebuttalRequest(BaseModel):
    subject: str = Field(..., max_length=6000)
    theme: str = Field(default="", max_length=100)
    difficulty: str = Field(default="", max_length=100)
    history: List[HistoryItem] = Field(default_factory=list)
    userText: str = Field(..., max_length=6000)
    exchange: int = 1
    maxExchanges: int = 3

class DuelTurnRequest(BaseModel):
    subject: str = Field(..., max_length=6000)
    userSide: Literal["pour", "contre"]
    history: List[HistoryItem] = Field(default_factory=list)
    userText: str = Field(..., max_length=6000)
    turn: int = 1
    maxTurns: int = 3
    theme: str = Field(default="", max_length=100)
    difficulty: str = Field(default="", max_length=100)

class DuelVerdictRequest(BaseModel):
    subject: str = Field(..., max_length=6000)
    userSide: Literal["pour", "contre"]
    history: List[HistoryItem] = Field(default_factory=list)

class ExplainRequest(BaseModel):
    concept: str = Field(..., max_length=6000)
    audienceA: str = Field(..., max_length=6000)
    textA: str = Field(..., max_length=6000)
    audienceB: str = Field(..., max_length=6000)
    textB: str = Field(..., max_length=6000)

PHRASE_TYPES = [
    "virelangue",
    "longue",
    "chiffres",
    "noms_propres",
    "vocabulaire_soutenu",
    "liaisons",
    "sons_proches",
]

class PhrasesRequest(BaseModel):
    startLevel: int = Field(default=1, ge=1, le=10)
    count: int = Field(default=10, ge=1, le=15)
    weakTypes: List[str] = Field(default_factory=list)

coach_router = APIRouter(prefix="/coach", tags=["coach"])

@coach_router.get("/status")
def get_coach_status() -> dict:
    vertex_project = (os.getenv("VERTEX_PROJECT", "") or VERTEX_PROJECT).strip()
    vertex_models = get_vertex_models()
    pro_models = get_vertex_pro_models()
    models = get_configured_models()
    exhausted = get_exhausted_models()

    candidates: List[str] = []
    if get_api_key():
        candidates.extend([f"gratuit:{m}" for m in models])
    if vertex_project:
        candidates.extend([f"vertex:{m}" for m in vertex_models])
    if not candidates:
        candidates = [f"gratuit:{m}" for m in models]

    active_model = next((c for c in candidates if c not in exhausted), candidates[0] if candidates else "")

    return {
        "available": is_coach_available(),
        "vertex": bool(vertex_project),
        "model": active_model,
        "models": models,
        "vertexModels": vertex_models,
        "proModels": pro_models,
        "exhausted": exhausted,
    }

@coach_router.post("/feedback")
def get_feedback(req: FeedbackRequest) -> dict:
    allow_improved = (req.attempt >= 2) or req.wantModel
    game_instructions = {
        "debate": "Consigne spécifique jeu Débat : analyse la clarté et force de la thèse, la pertinence des preuves, la logique de l'argumentation et la prise en compte des contre-arguments.",
        "clarity": "Consigne spécifique jeu Clarté : analyse la structure générale du propos, les articulations et les éventuels sauts logiques ou digressions.",
        "mirror": "Consigne spécifique jeu Miroir : analyse les métriques vocales (débit, hésitations, silences, répétitions) et la transcription. S'il n'y a qu'une prise, donne UN seul objectif concret et mesurable pour la prise suivante. S'il y a deux prises (PRISE 1 / PRISE 2), compare-les chiffres à l'appui : dis clairement si l'objectif est atteint, ce qui a progressé et ce qui a régressé.",
        "vocabulary": "Consigne spécifique jeu Vocabulaire : tu reçois le journal des réponses d'un sprint. Juge la justesse ET la nuance des mots donnés (un synonyme accepté peut être approximatif : explique la différence de sens). Propose 2 ou 3 mots plus riches ou plus précis que ceux employés, sans donner la liste des bonnes réponses. Ta question finale doit demander à l'utilisateur de réutiliser l'un de ces mots dans une phrase à l'oral.",
    }

    improved_instruction = (
        "Puisque attempt >= 2 ou wantModel est vrai, propose dans 'improved' une version améliorée courte, percutante et adaptée à l'oral."
        if allow_improved
        else "Le champ 'improved' DOIT impérativement être null."
    )

    metrics_str = json.dumps(req.metrics, ensure_ascii=False) if req.metrics else "Aucune métrique fournie"
    ctx = context_instruction(req.theme, req.difficulty)
    ctx_line = f"\n{ctx}\n" if ctx else ""

    prompt = f"""
Analyse la prise de parole suivante :
Jeu : {req.game}
Sujet : {req.subject}
Transcription de l'utilisateur :
\"\"\"{req.transcript}\"\"\"{ctx_line}
Métriques vocales : {metrics_str}
Numéro de tentative : {req.attempt}
Demande de modèle : {req.wantModel}

{game_instructions.get(req.game, "")}
{improved_instruction}

Rappel du principe pédagogique :
1 point fort précis et justifié, 1 faiblesse principale argumentée (pourquoi elle affaiblit le propos), 1 question qui force à creuser.

Format JSON attendu :
{{
  "strength": "1 point fort précis et justifié",
  "weakness": "1 faiblesse principale argumentée",
  "why": "pourquoi cette faiblesse affaiblit le propos",
  "question": "1 question qui force à creuser la réflexion",
  "nextGoal": "1 objectif concret pour la prise suivante",
  "improved": {"string" if allow_improved else "null"},
  "argumentation": [
    "2 ou 3 critiques précises de l'argumentation : thèse floue, argument non prouvé, généralisation, contre-argument ignoré, lien logique manquant… en citant les mots de l'utilisateur"
  ],
  "examples": [
    {{"instead": "ce que l'utilisateur a dit (citation courte)", "better": "une formulation plus forte qu'il aurait pu dire à l'oral"}}
  ]
}}
"""
    result, used_model = call_gemini(prompt, bilan=True)
    improved_val = result.get("improved") if allow_improved else None

    raw_arg = result.get("argumentation") or []
    if isinstance(raw_arg, list):
        norm_arg = [str(a) for a in raw_arg]
    elif raw_arg:
        norm_arg = [str(raw_arg)]
    else:
        norm_arg = []

    raw_ex = result.get("examples") or []
    norm_ex = []
    if isinstance(raw_ex, list):
        for item in raw_ex:
            if isinstance(item, dict):
                norm_ex.append({
                    "instead": str(item.get("instead", "")),
                    "better": str(item.get("better", "")),
                })

    return {
        "strength": str(result.get("strength", "")),
        "weakness": str(result.get("weakness", "")),
        "why": str(result.get("why", "")),
        "question": str(result.get("question", "")),
        "nextGoal": str(result.get("nextGoal", "")),
        "improved": str(improved_val) if improved_val is not None else None,
        "argumentation": norm_arg,
        "examples": norm_ex,
        "model": used_model,
    }

@coach_router.post("/topic/check")
def check_topic(req: TopicCheckRequest) -> dict:
    prompt = f"""
Analyse cette proposition de sujet ou thème pour un concours ou entraînement d'éloquence :
Entrée utilisateur : \"{req.input}\"
Profil utilisateur : \"{req.profile}\"

MODÉRATION :
- ACCEPTER les sujets de société débattus comme en concours d'éloquence (exemples : peine de mort, nucléaire, réseaux sociaux, religion à l'école, IA, bioéthique, etc.).
- REFUSER : ce qui vise une personne réelle nommée (sauf s'il s'agit d'un débat sur une politique publique officielle), la haine envers un groupe, l'incitation à la violence, tout contenu dangereux ou à caractère sexuel.

RÈGLES DE FORMAT :
- Si REFUSÉ :
  status = "refused"
  kind = "theme" ou "subject"
  reason = explication bienveillante du refus
  alternative = une alternative proche et acceptable pour un débat
  subjects = [] (liste vide obligatoire)
- Si ACCEPTÉ et l'entrée est un THÈME (ex: "le sport", "l'intelligence artificielle", "l'art") :
  status = "accepted"
  kind = "theme"
  reason = courte justification
  subjects = exactement 3 sujets de débat précis formulés en question fermée
  alternative = null
- Si ACCEPTÉ et l'entrée est déjà un SUJET (ex: "Faut-il interdire les devoirs à la maison ?") :
  status = "accepted"
  kind = "subject"
  reason = courte justification
  subjects = [le sujet reformulé proprement sous forme de question fermée]
  alternative = null

Format JSON attendu :
{{
  "status": "accepted" ou "refused",
  "kind": "theme" ou "subject",
  "theme": "thème général court (1 à 3 mots, minuscules, ex 'sport', 'écologie', 'politique')",
  "reason": "explication",
  "subjects": ["..."],
  "alternative": "..." ou null
}}
"""
    result, used_model = call_gemini(prompt)
    status = result.get("status", "accepted")
    if status not in ("accepted", "refused"):
        status = "accepted"
    kind = result.get("kind", "theme")
    if kind not in ("theme", "subject"):
        kind = "theme"

    theme = str(result.get("theme", "")).strip().lower()
    if not theme:
        theme = req.input.strip().lower()[:30]

    raw_subjects = result.get("subjects") or []
    if not isinstance(raw_subjects, list):
        raw_subjects = [str(raw_subjects)]

    if status == "refused":
        subjects: List[str] = []
        alternative = result.get("alternative") or "Un débat contradictoire sur ce thème dans un cadre républicain"
    else:
        alternative = None
        if kind == "subject":
            subj_text = str(raw_subjects[0]) if raw_subjects else req.input.strip()
            subjects = [subj_text]
        else:
            subjects = [str(s) for s in raw_subjects]
            while len(subjects) < 3:
                subjects.append(f"Faut-il limiter l'impact de : {req.input} ?")
            subjects = subjects[:3]

    return {
        "status": status,
        "kind": kind,
        "theme": theme,
        "reason": str(result.get("reason", "")),
        "subjects": subjects,
        "alternative": alternative,
        "model": used_model,
    }

@coach_router.post("/topic/suggest")
def suggest_topic(req: TopicSuggestRequest) -> dict:
    category_meanings = {
        "liked": "un thème que l'utilisateur aime d'après son profil",
        "disliked": "un thème qu'il évite pour le faire sortir de sa zone de confort",
        "test": "un sujet qui cible ses points faibles indiqués dans son profil",
    }
    avoid_list = json.dumps(req.avoid, ensure_ascii=False)

    prompt = f"""
Suggère un thème et 3 sujets de débat pour cet utilisateur :
Catégorie demandée : {req.category} ({category_meanings.get(req.category, "")})
Profil utilisateur : \"{req.profile}\"
Sujets à ÉVITER absolument (ne pas reprendre) : {avoid_list}

Consignes :
- reason : une phrase qui s'adresse à l'utilisateur (tutoiement) expliquant pourquoi ce sujet lui est proposé (ex: "Tu évites l'économie depuis plusieurs débats, on s'y confronte.").
- theme : le nom du thème retenu.
- subjects : exactement 3 sujets de débat précis et percutants sous forme de question fermée.

Format JSON attendu :
{{
  "theme": "nom du thème",
  "subjects": ["sujet 1", "sujet 2", "sujet 3"],
  "reason": "phrase personnalisée en tutoiement"
}}
"""
    result, used_model = call_gemini(prompt)
    raw_subjects = result.get("subjects") or []
    if not isinstance(raw_subjects, list):
        raw_subjects = [str(raw_subjects)]
    subjects = [str(s) for s in raw_subjects]
    while len(subjects) < 3:
        subjects.append("Faut-il revoir les règles actuelles ?")
    subjects = subjects[:3]

    return {
        "theme": str(result.get("theme", "")),
        "subjects": subjects,
        "reason": str(result.get("reason", "")),
        "model": used_model,
    }

AUDIO_TURN_INSTRUCTION = (
    "\n\nL'intervention de l'utilisateur est dans l'AUDIO joint (et non dans le texte ci-dessus). "
    "D'abord, transcris-la mot à mot dans le champ \"transcript\" (garde les hésitations « euh », "
    "ne corrige rien). Puis réponds à CE QU'IL A RÉELLEMENT DIT. Ajoute donc le champ "
    "\"transcript\" au JSON attendu."
)


def _history_from_form(history: str) -> List["HistoryItem"]:
    try:
        raw = json.loads(history or "[]")
        return [HistoryItem(**h) for h in raw if isinstance(h, dict)][-20:]
    except Exception:
        return []


@coach_router.post("/duel/turn")
def duel_turn(req: DuelTurnRequest) -> dict:
    result, used_model = call_gemini(build_duel_prompt(req), rapide=True)
    return {
        "reply": str(result.get("reply", "")),
        "pressure": str(result.get("pressure", "")),
        "model": used_model,
    }


def build_duel_prompt(req: "DuelTurnRequest") -> str:
    ai_side = "contre" if req.userSide == "pour" else "pour"
    history_lines = [f"{h.role.upper()} : {h.text}" for h in req.history]
    history_str = "\n".join(history_lines) if history_lines else "Début de la confrontation."
    ctx = context_instruction(req.theme, req.difficulty)
    ctx_line = f"\n{ctx}\n" if ctx else ""

    prompt = f"""
Tu es l'adversaire de l'utilisateur dans un duel d'éloquence contradictoire.{ctx_line}
Sujet du duel : \"{req.subject}\"
Position de l'utilisateur : {req.userSide.upper()}
TA POSITION (à défendre sans concession) : {ai_side.upper()}
Tour : {req.turn} / {req.maxTurns}

Historique du duel :
{history_str}

Nouvelle intervention de l'utilisateur :
\"{req.userText}\"

Consignes :
- Défends la position {ai_side.upper()} avec de vrais arguments solides.
- Réponds directement à ce que vient de dire l'utilisateur en attaquant son point le plus faible.
- 'reply' : 3 à 5 phrases, style oral, percutant, destiné à être lu à voix haute.
- 'pressure' : une question piège courte et incisive que l'utilisateur doit traiter au tour suivant.

Format JSON attendu :
{{
  "reply": "3 à 5 phrases orales percutantes",
  "pressure": "une question piège courte"
}}
"""
    return prompt


@coach_router.post("/rebuttal")
def rebuttal(req: RebuttalRequest) -> dict:
    result, used_model = call_gemini(build_rebuttal_prompt(req), rapide=True)
    return {
        "reply": str(result.get("reply", "")),
        "question": str(result.get("question", "")),
        "model": used_model,
    }


def build_rebuttal_prompt(req: "RebuttalRequest") -> str:
    ctx = context_instruction(req.theme, req.difficulty)
    history_lines = [f"{h.role.upper()} : {h.text}" for h in req.history]
    history_str = "\n".join(history_lines) if history_lines else "Début de l'échange."

    prompt_parts = []
    if ctx:
        prompt_parts.append(ctx)
    prompt_parts.append(f"Sujet : \"{req.subject}\"")
    prompt_parts.append(f"Échange : {req.exchange} / {req.maxExchanges}")
    prompt_parts.append(f"Historique :\n{history_str}")
    prompt_parts.append(f"Dernier argument de l'utilisateur :\n\"{req.userText}\"")
    prompt_parts.append(
        "Consigne :\n"
        "Réponds DIRECTEMENT à l'argument de l'utilisateur en 2 à 4 phrases faciles à dire à l'oral "
        "(pas de listes, pas de markdown), puis termine par UNE question ou objection qui l'oblige à répondre."
    )
    prompt_parts.append("""Format JSON attendu :
{
  "reply": "2 à 4 phrases orales directes et percutantes",
  "question": "UNE question ou objection incisive"
}""")
    return "\n\n".join(prompt_parts)


# Versions « audio » : la réponse enregistrée est envoyée directement à l'adversaire, qui
# la transcrit ET y répond en un seul appel (au lieu de transcription puis réplique).
@coach_router.post("/rebuttal/audio")
async def rebuttal_audio(
    file: UploadFile = File(...),
    subject: str = Form(""),
    theme: str = Form(""),
    difficulty: str = Form(""),
    history: str = Form("[]"),
    exchange: int = Form(1),
    maxExchanges: int = Form(3),
) -> dict:
    part = await asyncio.to_thread(audio_to_mp3_part, await _read_upload(file))
    req = RebuttalRequest(subject=subject[:6000], theme=theme[:100], difficulty=difficulty[:100],
                          history=_history_from_form(history), userText="(voir l'audio joint)",
                          exchange=exchange, maxExchanges=maxExchanges)
    prompt = build_rebuttal_prompt(req) + AUDIO_TURN_INSTRUCTION
    result, used_model = await asyncio.to_thread(call_gemini, prompt, "", False, [part], True)
    return {
        "transcript": str(result.get("transcript", "")).strip(),
        "reply": str(result.get("reply", "")),
        "question": str(result.get("question", "")),
        "model": used_model,
    }


@coach_router.post("/duel/turn/audio")
async def duel_turn_audio(
    file: UploadFile = File(...),
    subject: str = Form(""),
    userSide: Literal["pour", "contre"] = Form("pour"),
    theme: str = Form(""),
    difficulty: str = Form(""),
    history: str = Form("[]"),
    turn: int = Form(1),
    maxTurns: int = Form(3),
) -> dict:
    part = await asyncio.to_thread(audio_to_mp3_part, await _read_upload(file))
    req = DuelTurnRequest(subject=subject[:6000], userSide=userSide, theme=theme[:100],
                          difficulty=difficulty[:100], history=_history_from_form(history),
                          userText="(voir l'audio joint)", turn=turn, maxTurns=maxTurns)
    prompt = build_duel_prompt(req) + AUDIO_TURN_INSTRUCTION
    result, used_model = await asyncio.to_thread(call_gemini, prompt, "", False, [part], True)
    return {
        "transcript": str(result.get("transcript", "")).strip(),
        "reply": str(result.get("reply", "")),
        "pressure": str(result.get("pressure", "")),
        "model": used_model,
    }


class HelpRequest(BaseModel):
    subject: str = Field(..., max_length=6000)
    theme: str = Field(default="", max_length=100)
    difficulty: str = Field(default="", max_length=100)
    stage: Literal["sujet", "replique"] = "sujet"
    opponentText: str = Field(default="", max_length=6000)
    userText: str = Field(default="", max_length=6000)


@coach_router.post("/help")
def debate_help(req: HelpRequest) -> dict:
    """Bouton « Aide » du débat : décrypte la situation et donne des pistes, sans écrire
    la réponse complète à la place de l'utilisateur (il doit encore réfléchir et parler)."""
    ctx = context_instruction(req.theme, req.difficulty)
    if req.stage == "replique":
        situation = (
            f"L'utilisateur a dit : « {req.userText} »\n"
            f"Son adversaire vient de répondre : « {req.opponentText} »\n"
            "L'utilisateur doit maintenant répondre à cette réplique."
        )
    else:
        situation = "L'utilisateur découvre le sujet et va devoir prendre la parole dessus."
    prompt = f"""
Pour cette tâche tu es un coach bienveillant qui AIDE un débutant en difficulté, pas un critique.
{ctx}
Sujet : « {req.subject} »
{situation}

Aide-le à se lancer, en phrases courtes et simples, faciles à comprendre et à retenir :
- "situation" : 1 ou 2 phrases qui expliquent ce qui se joue (ce qu'on attend de lui, le piège éventuel).
- "reagir" : 1 phrase sur l'attitude à adopter (ton, structure : par exemple « reconnais un point, puis contre-attaque »).
- "pistes" : 3 idées d'arguments ou d'angles possibles, en quelques mots chacune (pas des phrases toutes faites à réciter).
- "amorce" : UNE phrase d'accroche pour démarrer à l'oral.
- "eviter" : 2 erreurs à ne pas faire, en quelques mots.

Format JSON attendu :
{{"situation": "...", "reagir": "...", "pistes": ["...", "...", "..."], "amorce": "...", "eviter": ["...", "..."]}}
"""
    result, used_model = call_gemini(prompt, rapide=True)

    def as_list(value) -> List[str]:
        return [str(v).strip() for v in (value if isinstance(value, list) else [value]) if str(v).strip()][:4]

    return {
        "situation": str(result.get("situation", "")).strip(),
        "reagir": str(result.get("reagir", "")).strip(),
        "pistes": as_list(result.get("pistes", [])),
        "amorce": str(result.get("amorce", "")).strip(),
        "eviter": as_list(result.get("eviter", [])),
        "model": used_model,
    }


async def _read_upload(file: UploadFile) -> bytes:
    content = await file.read()
    if len(content) > 10 * 1024 * 1024:
        raise HTTPException(status_code=400, detail="Fichier audio supérieur à 10 Mo.")
    return content

@coach_router.post("/duel/verdict")
def duel_verdict(req: DuelVerdictRequest) -> dict:
    ai_side = "contre" if req.userSide == "pour" else "pour"
    history_lines = [f"{h.role.upper()} : {h.text}" for h in req.history]
    history_str = "\n".join(history_lines) if history_lines else "Aucun échange consigné."

    prompt = f"""
Tu es l'arbitre et le coach d'éloquence d'un duel terminé.
Sujet : \"{req.subject}\"
Position de l'utilisateur : {req.userSide.upper()}
Position de l'IA adverse : {ai_side.upper()}

Déroulement du duel :
{history_str}

Évalue la prestation de l'utilisateur :
- score : une note globale entre 0 et 100 reflétant sa persuasion, sa cohérence et sa répartie.
- bestArguments : liste de ses arguments les plus solides ou percutants.
- weakPoints : liste de ses faiblesses logiques ou failles argumentatives.
- dodged : liste des questions ou arguments de l'IA que l'utilisateur a esquivés sans y répondre franchement.
- advice : conseil de synthèse pour s'améliorer en duel d'éloquence (tutoiement).

Format JSON attendu :
{{
  "score": 75,
  "bestArguments": ["..."],
  "weakPoints": ["..."],
  "dodged": ["..."],
  "advice": "..."
}}
"""
    result, used_model = call_gemini(prompt, bilan=True)
    try:
        score = int(result.get("score", 70))
        score = max(0, min(100, score))
    except Exception:
        score = 70

    def to_str_list(val: Any) -> List[str]:
        if isinstance(val, list):
            return [str(x) for x in val]
        if val:
            return [str(val)]
        return []

    return {
        "score": score,
        "bestArguments": to_str_list(result.get("bestArguments")),
        "weakPoints": to_str_list(result.get("weakPoints")),
        "dodged": to_str_list(result.get("dodged")),
        "advice": str(result.get("advice", "")),
        "model": used_model,
    }

@coach_router.post("/explain")
def explain_concept(req: ExplainRequest) -> dict:
    prompt = f"""
Tu es un coach évaluant un exercice d'adaptation du discours et de vulgarisation.
Concept à expliquer : \"{req.concept}\"

Public A : \"{req.audienceA}\"
Explication fournie pour le Public A :
\"{req.textA}\"

Public B : \"{req.audienceB}\"
Explication fournie pour le Public B :
\"{req.textB}\"

Évalue la prestation :
- Le vocabulaire, les exemples et le niveau de détail sont-ils bien adaptés à chaque public ?
- Le fond conceptuel reste-t-il juste, rigoureux et fidèle au concept ?
- Comment s'est opérée l'adaptation entre les deux publics ?

Format JSON attendu :
{{
  "scoreA": 80,
  "scoreB": 75,
  "feedbackA": "retour précis pour le public A",
  "feedbackB": "retour précis pour le public B",
  "adaptation": "analyse de la transition et de l'adaptation du registre",
  "question": "question pour approfondir ou tester une nouvelle variante"
}}
"""
    result, used_model = call_gemini(prompt, bilan=True)
    try:
        score_a = max(0, min(100, int(result.get("scoreA", 70))))
    except Exception:
        score_a = 70
    try:
        score_b = max(0, min(100, int(result.get("scoreB", 70))))
    except Exception:
        score_b = 70

    return {
        "scoreA": score_a,
        "scoreB": score_b,
        "feedbackA": str(result.get("feedbackA", "")),
        "feedbackB": str(result.get("feedbackB", "")),
        "adaptation": str(result.get("adaptation", "")),
        "question": str(result.get("question", "")),
        "model": used_model,
    }

@coach_router.post("/voice")
async def voice_feedback(
    files: List[UploadFile] = File(...),
    game: str = Form("mirror"),
    subject: str = Form(""),
    transcripts: str = Form(""),
    metrics: str = Form(""),
    theme: str = Form(""),
    difficulty: str = Form(""),
) -> dict:
    if not (1 <= len(files) <= 2):
        raise HTTPException(status_code=400, detail="1 ou 2 fichiers audio maximum.")

    parts: List[types.Part] = []
    temp_dir = tempfile.mkdtemp(prefix="coach_voice_")
    try:
        for idx, upload_file in enumerate(files):
            content = await upload_file.read()
            if len(content) > 10 * 1024 * 1024:
                raise HTTPException(status_code=400, detail="Fichier audio supérieur à 10 Mo.")

            entree = os.path.join(temp_dir, f"input_{idx}")
            with open(entree, "wb") as f_in:
                f_in.write(content)

            sortie_mp3 = os.path.join(temp_dir, f"output_{idx}.mp3")
            try:
                subprocess.run(
                    [
                        "ffmpeg",
                        "-y",
                        "-loglevel",
                        "error",
                        "-i",
                        entree,
                        "-ac",
                        "1",
                        "-ar",
                        "16000",
                        "-b:a",
                        "48k",
                        sortie_mp3,
                    ],
                    check=True,
                    timeout=60,
                )
            except Exception:
                raise HTTPException(status_code=400, detail="Audio illisible")

            with open(sortie_mp3, "rb") as f_out:
                mp3_bytes = f_out.read()

            parts.append(types.Part.from_bytes(data=mp3_bytes, mime_type="audio/mpeg"))
    finally:
        shutil.rmtree(temp_dir, ignore_errors=True)

    system_extra = (
        "Tu ÉCOUTES le ou les enregistrements audio joints. "
        "Juge la VOIX elle-même, pas seulement les mots : intonation (monotone ou expressive), "
        "rythme et débit, pauses (utiles ou subies), assurance perçue, articulation et diction, énergie. "
        "Cite des moments précis (début, milieu, fin)."
    )

    prompt_sections = []
    ctx = context_instruction(theme, difficulty)
    if ctx:
        prompt_sections.append(ctx)
    prompt_sections.append(f"Jeu : {game}")
    prompt_sections.append(f"Sujet : {subject}")
    if transcripts:
        prompt_sections.append(f"Transcriptions : {transcripts}")
    if metrics:
        prompt_sections.append(f"Métriques : {metrics}")

    if len(files) == 2:
        prompt_sections.append("Audio 1 = prise 1, audio 2 = prise 2 : compare-les et dis si l'objectif est atteint.")

    prompt_sections.append("""Format JSON attendu :
{
  "voix": {
    "intonation": {"note": 7, "commentaire": "..."},
    "rythme": {"note": 6, "commentaire": "..."},
    "pauses": {"note": 8, "commentaire": "..."},
    "assurance": {"note": 7, "commentaire": "..."},
    "diction": {"note": 8, "commentaire": "..."},
    "energie": {"note": 7, "commentaire": "..."}
  },
  "strength": "...",
  "weakness": "...",
  "why": "...",
  "question": "...",
  "nextGoal": "1 seul objectif mesurable pour la prochaine prise",
  "progress": "si 2 prises : ce qui a progressé et régressé, sinon null",
  "argumentation": [
    "2 ou 3 critiques précises de l'argumentation : thèse floue, argument non prouvé, généralisation, contre-argument ignoré, lien logique manquant… en citant les mots de l'utilisateur"
  ],
  "examples": [
    {"instead": "ce que l'utilisateur a dit (citation courte)", "better": "une formulation plus forte qu'il aurait pu dire à l'oral"}
  ]
}""")
    prompt = "\n\n".join(prompt_sections)

    result, used_model = await asyncio.to_thread(call_gemini, prompt, system_extra, True, parts)

    # Normalisation du dictionnaire retourné
    raw_voix = result.get("voix") if isinstance(result.get("voix"), dict) else {}
    criteres = ["intonation", "rythme", "pauses", "assurance", "diction", "energie"]
    norm_voix = {}
    for crit in criteres:
        item = raw_voix.get(crit) if isinstance(raw_voix.get(crit), dict) else {}
        try:
            note = int(item.get("note", 7))
            note = max(1, min(10, note))
        except Exception:
            note = 7
        norm_voix[crit] = {
            "note": note,
            "commentaire": str(item.get("commentaire", "")),
        }

    raw_progress = result.get("progress")
    progress_val = str(raw_progress) if raw_progress and str(raw_progress).lower() != "null" else None

    raw_arg = result.get("argumentation") or []
    if isinstance(raw_arg, list):
        norm_arg = [str(a) for a in raw_arg]
    elif raw_arg:
        norm_arg = [str(raw_arg)]
    else:
        norm_arg = []

    raw_ex = result.get("examples") or []
    norm_ex = []
    if isinstance(raw_ex, list):
        for item in raw_ex:
            if isinstance(item, dict):
                norm_ex.append({
                    "instead": str(item.get("instead", "")),
                    "better": str(item.get("better", "")),
                })

    return {
        "voix": norm_voix,
        "strength": str(result.get("strength", "")),
        "weakness": str(result.get("weakness", "")),
        "why": str(result.get("why", "")),
        "question": str(result.get("question", "")),
        "nextGoal": str(result.get("nextGoal", "")),
        "progress": progress_val,
        "argumentation": norm_arg,
        "examples": norm_ex,
        "model": used_model,
    }

@coach_router.post("/phrases")
def generate_phrases(req: PhrasesRequest) -> dict:
    start_level = max(1, min(10, req.startLevel))
    count = max(1, min(15, req.count))
    valid_weak = [t for t in req.weakTypes if t in PHRASE_TYPES]
    weak_info = ""
    if valid_weak:
        weak_str = ", ".join(valid_weak)
        weak_info = f"- Points faibles ciblés de l'utilisateur : {weak_str}. Environ la moitié des phrases générées DOIVENT être choisies parmi ces types pour cibler ses difficultés."

    allowed_types_str = ", ".join(PHRASE_TYPES)

    prompt = f"""
Génère une liste de {count} phrases en français pour un exercice de répétition orale d'élocution (« Répète la phrase »).
L'utilisateur entend chaque phrase et doit la répéter fidèlement à voix haute.

Règles de progression :
- La n-ième phrase (de 1 à {count}) doit être au niveau min(10, {start_level} + (n - 1) // 2) : le niveau monte d'un cran toutes les DEUX phrases.
- Échelle de difficulté (progression douce, l'utilisateur débute) :
  * Niveau 1 = 4 à 6 mots très simples, sans piège de prononciation.
  * Niveau 3 = 8 à 10 mots, une petite difficulté (une liaison ou un son proche).
  * Niveau 5 = 12 à 15 mots, rythme naturel.
  * Niveau 7 = 16 à 20 mots, articulation plus exigeante.
  * Niveau 10 = 22 à 28 mots, virelangues exigeants.
  * Respecte STRICTEMENT ces longueurs : une phrase trop longue pour son niveau est une erreur.
- Types autorisés (chaque phrase doit avoir exactement un type parmi) : {allowed_types_str}.
{weak_info}
- Phrases naturelles, conçues pour être dites à l'oral, sans guillemets, ponctuation simple (points, virgules).

Format JSON attendu :
{{
  "phrases": [
    {{"text": "phrase à répéter à l'oral", "type": "virelangue", "level": 1}}
  ]
}}
"""
    result, used_model = call_gemini(prompt, bilan=False)
    raw_phrases = result.get("phrases") if isinstance(result.get("phrases"), list) else []

    phrases = []
    for i, p in enumerate(raw_phrases):
        if not isinstance(p, dict):
            continue
        text = str(p.get("text", "")).strip().strip('"').strip("«»")
        if not text:
            continue
        ptype = str(p.get("type", "")).strip().lower()
        if ptype not in PHRASE_TYPES:
            ptype = "longue"
        expected_level = min(10, start_level + len(phrases) // 2)
        try:
            level = int(p.get("level", expected_level))
            level = max(1, min(10, level))
        except Exception:
            level = expected_level
        phrases.append({
            "text": text,
            "type": ptype,
            "level": level,
        })

    return {
        "phrases": phrases,
        "model": used_model,
    }


def audio_to_mp3_part(content: bytes) -> types.Part:
    """Convertit un enregistrement (webm, wav…) en mp3 mono 16 kHz pour Gemini."""
    temp_dir = tempfile.mkdtemp(prefix="coach_transcribe_")
    try:
        entree = os.path.join(temp_dir, "input")
        sortie = os.path.join(temp_dir, "output.mp3")
        with open(entree, "wb") as f_in:
            f_in.write(content)
        try:
            subprocess.run(
                ["ffmpeg", "-y", "-loglevel", "error", "-i", entree,
                 "-ac", "1", "-ar", "16000", "-b:a", "48k", sortie],
                check=True, timeout=60,
            )
        except Exception:
            raise HTTPException(status_code=400, detail="Audio illisible (enregistrement vide ou trop court ?)")
        with open(sortie, "rb") as f_out:
            return types.Part.from_bytes(data=f_out.read(), mime_type="audio/mpeg")
    finally:
        shutil.rmtree(temp_dir, ignore_errors=True)


@coach_router.post("/transcribe")
async def transcribe(file: UploadFile = File(...)) -> dict:
    """Transcription rapide par Gemini (quelques secondes) : remplace Whisper local
    pour les échanges oraux, trop lent sur un petit processeur."""
    content = await file.read()
    if len(content) > 10 * 1024 * 1024:
        raise HTTPException(status_code=400, detail="Fichier audio supérieur à 10 Mo.")
    part = await asyncio.to_thread(audio_to_mp3_part, content)
    system_extra = (
        "Pour cette tâche tu n'es PAS coach : tu es un transcripteur. "
        "Transcris mot à mot, en français, exactement ce qui est dit dans l'audio joint. "
        "Ne corrige rien, ne reformule rien, n'ajoute rien : garde les fautes, les répétitions "
        "et les hésitations (écris-les « euh », « bah », « ben »). Si l'audio est vide ou inaudible, renvoie un texte vide."
    )
    prompt = 'Format JSON attendu : {"text": "transcription mot à mot"}'
    result, used_model = await asyncio.to_thread(call_gemini, prompt, system_extra, False, [part], True)
    return {"text": str(result.get("text", "")).strip(), "model": used_model}


