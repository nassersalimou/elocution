import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import { getProfile } from './services/storageService';
import AppLayout from './components/layout/AppLayout';
import Onboarding from './pages/Onboarding';
import Dashboard from './pages/Dashboard';
import Training from './pages/Training';
import ProgressPage from './pages/ProgressPage';
import HistoryPage from './pages/HistoryPage';
import SettingsPage from './pages/SettingsPage';
import QuickSession from './pages/QuickSession';
import DebatePage from './games/debate/DebatePage';
import VocabularyGame from './games/vocabulary/VocabularyGame';
import VocalMirrorGame from './games/vocalMirror/VocalMirrorGame';
import ClarityGame from './games/clarity/ClarityGame';
import DuelPage from './games/duel/DuelPage';
import ExplainPage from './games/explain/ExplainPage';
import RepeatGame from './games/repeat/RepeatGame';
import ErrorBoundary from './components/ui/ErrorBoundary';
import './styles/globals.css';
import './components/layout/Layout.css';

function RequireOnboarding({ children }) {
  const profile = getProfile();
  if (!profile.onboardingComplete) {
    return <Navigate to="/onboarding" replace />;
  }
  return children;
}

export default function App() {
  return (
    <HashRouter>
      <Routes>
        <Route path="/onboarding" element={<Onboarding />} />
        <Route element={<RequireOnboarding><AppLayout /></RequireOnboarding>}>
          <Route path="/" element={<Dashboard />} />
          <Route path="/entrainement" element={<Training />} />
          <Route path="/progression" element={<ProgressPage />} />
          <Route path="/historique" element={<HistoryPage />} />
          <Route path="/reglages" element={<SettingsPage />} />
          <Route path="/session-rapide" element={<ErrorBoundary gameTitle="Session Rapide"><QuickSession /></ErrorBoundary>} />
          <Route path="/jeu/debat" element={<ErrorBoundary gameTitle="Réflexe Débat"><DebatePage /></ErrorBoundary>} />
          <Route path="/jeu/duel" element={<ErrorBoundary gameTitle="Duel contradictoire"><DuelPage /></ErrorBoundary>} />
          <Route path="/jeu/explique" element={<ErrorBoundary gameTitle="Explique à deux publics"><ExplainPage /></ErrorBoundary>} />
          <Route path="/jeu/vocabulaire" element={<ErrorBoundary gameTitle="Sprint Vocabulaire"><VocabularyGame /></ErrorBoundary>} />
          <Route path="/jeu/repete" element={<ErrorBoundary gameTitle="Répète la phrase"><RepeatGame /></ErrorBoundary>} />
          <Route path="/jeu/miroir" element={<ErrorBoundary gameTitle="Miroir Vocal"><VocalMirrorGame /></ErrorBoundary>} />
          <Route path="/jeu/clarte" element={<ErrorBoundary gameTitle="Construis ta pensée"><ClarityGame /></ErrorBoundary>} />
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </HashRouter>
  );
}
