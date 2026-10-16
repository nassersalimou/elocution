import { useEffect, useState } from 'react';
import './AdversaryAvatar.css';
import penseMenton from '../../assets/adversaire/pense-menton.webp';
import penseTete from '../../assets/adversaire/pense-tete.webp';
import penseMalin from '../../assets/adversaire/pense-malin.webp';
import parlePoing from '../../assets/adversaire/parle-poing.webp';
import parleMain from '../../assets/adversaire/parle-main.webp';
import parleHaussement from '../../assets/adversaire/parle-haussement.webp';
import parleDoigt from '../../assets/adversaire/parle-doigt.webp';
import parleSourire from '../../assets/adversaire/parle-sourire.webp';

// L'adversaire de l'IA en images : une image « il réfléchit » ou « il parle » à la fois,
// qui change au hasard (sans jamais répéter la précédente) pour donner l'impression de
// quelqu'un en face de soi.
const POSES = {
  thinking: [penseMenton, penseTete, penseMalin],
  speaking: [parlePoing, parleMain, parleHaussement, parleDoigt, parleSourire],
};
const CAPTIONS = {
  thinking: 'L\'adversaire réfléchit…',
  speaking: 'L\'adversaire te répond',
};
const ROTATE_MS = { thinking: 4500, speaking: 4500 };

function pickOther(list, current) {
  if (list.length <= 1) return 0;
  let next = Math.floor(Math.random() * list.length);
  if (next === current) next = (next + 1) % list.length;
  return next;
}

// `children` : le texte affiché PAR-DESSUS l'image (réplique de l'adversaire, etc.).
export function AdversaryAvatar({ mood = 'thinking', children = null }) {
  const poses = POSES[mood] || POSES.thinking;
  const [index, setIndex] = useState(() => Math.floor(Math.random() * poses.length));

  // Précharge toutes les images pour éviter un clignotement au changement de pose.
  useEffect(() => {
    Object.values(POSES).flat().forEach((src) => {
      const img = new Image();
      img.src = src;
    });
  }, []);

  // Nouvelle pose au hasard régulièrement (le parent remonte le composant à chaque changement
  // d'humeur grâce à `key`, ce qui tire déjà une première pose au hasard).
  useEffect(() => {
    const id = setInterval(() => setIndex((i) => pickOther(poses, i)), ROTATE_MS[mood] || 3500);
    return () => clearInterval(id);
  }, [mood, poses]);

  const src = poses[index % poses.length];

  return (
    <div className="adv-stage">
      <img key={src} className="animate-fade-in" src={src} alt={CAPTIONS[mood]} />
      <span className="adv-badge">{CAPTIONS[mood]}</span>
      {children && <div className="adv-overlay">{children}</div>}
    </div>
  );
}

export default AdversaryAvatar;
