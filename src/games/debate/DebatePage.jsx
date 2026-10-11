import { useState } from 'react';
import DebateConfig from './DebateConfig';
import DebateGame from './DebateGame';

export function DebatePage({ quickMode = false, onComplete }) {
  const [config, setConfig] = useState(null);

  if (!config) {
    return <DebateConfig onStart={setConfig} quickMode={quickMode} />;
  }

  return <DebateGame config={config} onComplete={onComplete} />;
}

export default DebatePage;
