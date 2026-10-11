import { useState } from 'react';
import ExplainConfig from './ExplainConfig';
import ExplainGame from './ExplainGame';

export function ExplainPage({ onComplete }) {
  const [config, setConfig] = useState(null);

  if (!config) {
    return <ExplainConfig onStart={setConfig} />;
  }

  return (
    <ExplainGame
      config={config}
      onComplete={onComplete}
      onRestart={() => setConfig(null)}
    />
  );
}

export default ExplainPage;
