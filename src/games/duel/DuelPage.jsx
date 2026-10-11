import { useState } from 'react';
import DuelConfig from './DuelConfig';
import DuelGame from './DuelGame';

export function DuelPage({ onComplete }) {
  const [config, setConfig] = useState(null);

  if (!config) {
    return <DuelConfig onStart={setConfig} />;
  }

  return (
    <DuelGame
      config={config}
      onComplete={onComplete}
      onRestart={() => setConfig(null)}
    />
  );
}

export default DuelPage;
