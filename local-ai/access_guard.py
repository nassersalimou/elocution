"""
Garde d'accès et limitation quotidienne pour le serveur IA (Cloud Run).
Si ACCESS_CODE est vide, aucun contrôle n'est effectué (usage local).
"""
import os
import secrets
import threading
from datetime import datetime, timezone
from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse

ACCESS_CODE = os.getenv("ACCESS_CODE", "").strip()
DAILY_LIMIT = int(os.getenv("DAILY_LIMIT", "0"))

_usage_lock = threading.Lock()
_usage = {}  # {date_str: count}


def get_access_code() -> str:
    return os.getenv("ACCESS_CODE", ACCESS_CODE).strip()


def get_daily_limit() -> int:
    try:
        return int(os.getenv("DAILY_LIMIT", str(DAILY_LIMIT)))
    except ValueError:
        return 0


def install_guard(app: FastAPI):
    @app.middleware("http")
    async def access_guard_middleware(request: Request, call_next):
        # a) Laisse TOUJOURS passer les requêtes OPTIONS (CORS preflight) et GET /health
        if request.method == "OPTIONS" or (request.method == "GET" and request.url.path == "/health"):
            return await call_next(request)

        # b) Si ACCESS_CODE est défini et que X-Access-Code ne correspond pas -> 401
        access_code = get_access_code()
        if access_code:
            provided_code = request.headers.get("x-access-code", "")
            if not secrets.compare_digest(provided_code, access_code):
                return JSONResponse(
                    status_code=401,
                    content={"detail": "Code d'accès invalide"},
                )

        # c) Limite par jour (sur les requêtes POST)
        daily_limit = get_daily_limit()
        if daily_limit > 0 and request.method == "POST":
            today_str = datetime.now(timezone.utc).strftime("%Y-%m-%d")
            with _usage_lock:
                current_count = _usage.get(today_str, 0)
                if current_count >= daily_limit:
                    return JSONResponse(
                        status_code=429,
                        content={"detail": "Limite du jour atteinte"},
                    )
                _usage[today_str] = current_count + 1

        return await call_next(request)

    @app.get("/usage/today")
    def usage_today():
        today_str = datetime.now(timezone.utc).strftime("%Y-%m-%d")
        with _usage_lock:
            count = _usage.get(today_str, 0)
        return {
            "date": today_str,
            "count": count,
            "limit": get_daily_limit(),
        }
