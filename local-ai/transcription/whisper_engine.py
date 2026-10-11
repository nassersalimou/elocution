"""
Gestionnaire du moteur Whisper local optimisé pour la RAM (faster-whisper).
- Lazy loading : modèle chargé uniquement lors de la 1ère transcription.
- Un seul modèle en mémoire (base, cpu, int8).
- Déchargement manuel ou sur inactivité via unload_model().
"""
import os
import gc
import threading

class WhisperEngine:
    _instance = None
    _lock = threading.Lock()

    def __new__(cls):
        with cls._lock:
            if cls._instance is None:
                cls._instance = super(WhisperEngine, cls).__new__(cls)
                cls._instance._model = None
                cls._instance._model_name = os.environ.get("WHISPER_MODEL", "base")
                cls._instance._device = os.environ.get("WHISPER_DEVICE", "cpu")
                cls._instance._compute_type = os.environ.get("WHISPER_COMPUTE_TYPE", "int8")
        return cls._instance

    @property
    def is_loaded(self) -> bool:
        return self._model is not None

    def get_model(self):
        """Charge le modèle de façon paresseuse (lazy load) si non chargé."""
        with self._lock:
            if self._model is None:
                print(f"[INFO] Model loading: {self._model_name} (device={self._device}, compute_type={self._compute_type})")
                from faster_whisper import WhisperModel
                self._model = WhisperModel(
                    self._model_name,
                    device=self._device,
                    compute_type=self._compute_type,
                    cpu_threads=4,
                    num_workers=1
                )
                print(f"[INFO] Model loaded: {self._model_name} ({self._device}, {self._compute_type})")
            return self._model

    def unload_model(self):
        """Libère le modèle de la RAM immédiatement."""
        with self._lock:
            if self._model is not None:
                del self._model
                self._model = None
                gc.collect()
                print("[INFO] Model unloaded")
                return True
            return False

whisper_engine = WhisperEngine()
