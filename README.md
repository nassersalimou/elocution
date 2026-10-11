# &locution

**Entraîne ta pensée. Trouve tes mots. Parle avec impact.**

Application web d'entraînement à l'expression orale, 100 % locale — sans API, sans LLM, sans serveur backend.

![&locution](public/favicon.svg)

## Objectifs

&locution aide à développer :

- la rapidité de réflexion sous pression ;
- la structuration des idées ;
- le vocabulaire actif ;
- la conscience de sa propre voix ;
- la capacité à répondre spontanément.

## Fonctionnalités

### 4 jeux d'entraînement

| Jeu | Description |
|-----|-------------|
| **Réflexe Débat** | Réflexion puis réponse orale avec timers progressifs, enregistrement micro, auto-évaluation |
| **Sprint Vocabulaire** | Synonymes, antonymes, champs lexicaux, reformulation — 60 secondes chrono |
| **Miroir Vocal** | Parle, écoute, identifie tes défauts, refais une prise et compare |
| **Construis ta pensée** | Transforme des idées brutes en réponse structurée |

### Système de progression

- XP et niveaux (Novice → Légende)
- Série quotidienne (streak)
- Badges débloquables
- Historique des sessions
- Statistiques par compétence

### Session rapide — 5 minutes

Enchaînement automatique : 1 débat + 1 clarté + 1 miroir + 1 vocabulaire.

## Technologies

- **React 19** + **Vite 8**
- **React Router** pour la navigation
- **localStorage** pour la persistance
- **MediaRecorder API** pour l'enregistrement vocal
- **Speech Synthesis API** pour la lecture à voix haute
- CSS moderne (variables, glassmorphism, animations)

## Installation

### Prérequis

- Node.js 18+
- npm

### Commandes (Windows)

```powershell
cd "G:\Mon Drive\projet\elocution"
npm install
npm run dev
```

Ouvre [http://localhost:5173](http://localhost:5173) dans ton navigateur.

### Tests unitaires

```powershell
npm test
```

### Build production

```powershell
npm run build
npm run preview
```

## Architecture

```
src/
├── components/       # UI réutilisable (layout, timers, waveform, audio)
├── pages/            # Dashboard, progression, historique, réglages, onboarding
├── games/
│   ├── debate/       # Réflexe Débat
│   ├── vocabulary/   # Sprint Vocabulaire
│   ├── vocalMirror/  # Miroir Vocal
│   └── clarity/      # Construis ta pensée
├── hooks/            # useTimer, useAudioRecorder, useProfile
├── services/
│   ├── storageService.js    # Gestion centralisée du localStorage
│   ├── audioService.js      # MediaRecorder & cycle de vie des enregistrements
│   ├── speechService.js     # Speech Synthesis
│   ├── progressService.js   # Niveaux XP, streak, badges
│   └── feedbackEngine.js    # Provider pattern (LocalRuleFeedbackProvider, FutureLocalAIProvider)
├── data/             # Questions (+130), vocabulaire (+180), règles de feedback, badges
├── utils/            # Analyse texte, dates, adaptation difficulté, XP
└── tests/            # Suite de tests unitaires automatisés
```

Le fichier `src/services/feedbackEngine.js` implémente le pattern Provider (`FeedbackProvider`, `LocalRuleFeedbackProvider`, `FutureLocalAIProvider`) : aujourd'hui `LocalRuleFeedbackProvider` est actif et fournit des conseils déterministes 100 % locaux. Demain, un provider local (ex: Whisper local + LLM local) pourra être branché sans refonte de l'application.

## Limites actuelles

- Pas de transcription automatique de la voix
- Pas de détection automatique des hésitations ou du débit
- Feedback basé sur des règles et auto-évaluations (pas d'analyse sémantique)
- Données stockées uniquement dans le navigateur local
- Microphone requis pour les jeux vocaux (fonctionne sans micro, avec dégradation gracieuse)

## Roadmap

### Version actuelle — 100 % locale

- [x] 4 jeux fonctionnels
- [x] Progression XP / badges / streak
- [x] Session rapide 5 minutes
- [x] Design premium sombre responsive

### Version future

- [ ] Transcription automatique (Web Speech API ou Whisper local)
- [ ] Détection automatique des hésitations et silences
- [ ] Analyse du débit et de l'intonation
- [ ] Coach conversationnel par LLM
- [ ] Débats IA en temps réel
- [ ] Feedback personnalisé par IA
- [ ] Synthèse vocale améliorée

## Licence

Projet personnel — libre d'utilisation pour l'entraînement et le portfolio.
