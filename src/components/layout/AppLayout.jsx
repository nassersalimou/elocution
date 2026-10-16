import { useEffect, useState } from 'react';
import { NavLink, Outlet } from 'react-router-dom';
import Icon from '../ui/Icon';
import { CODE_REJECTED_EVENT, CODE_SAVED_EVENT } from '../../services/apiConfig';
import './Layout.css';

const NAV_ITEMS = [
  { to: '/', icon: 'home', label: 'Accueil' },
  { to: '/entrainement', icon: 'training', label: 'Entraînement' },
  { to: '/progression', icon: 'progress', label: 'Progression' },
  { to: '/historique', icon: 'history', label: 'Historique' },
  { to: '/reglages', icon: 'settings', label: 'Réglages' },
];

export function AppLayout() {
  const [codeRejected, setCodeRejected] = useState(false);

  useEffect(() => {
    const onRejected = () => setCodeRejected(true);
    const onSaved = () => setCodeRejected(false);
    window.addEventListener(CODE_REJECTED_EVENT, onRejected);
    window.addEventListener(CODE_SAVED_EVENT, onSaved);
    return () => {
      window.removeEventListener(CODE_REJECTED_EVENT, onRejected);
      window.removeEventListener(CODE_SAVED_EVENT, onSaved);
    };
  }, []);

  return (
    <div className="app-layout">
      <aside className="sidebar">
        <div className="sidebar-brand">
          <span className="brand-icon">EC</span>
          <span className="brand-text">{'&locution'}</span>
        </div>
        <nav className="sidebar-nav">
          {NAV_ITEMS.map((item) => (
            <NavLink key={item.to} to={item.to} end={item.to === '/'} className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
              <Icon name={item.icon} size={20} />
              <span>{item.label}</span>
            </NavLink>
          ))}
        </nav>
      </aside>

      <nav className="mobile-nav">
        {NAV_ITEMS.map((item) => (
          <NavLink key={item.to} to={item.to} end={item.to === '/'} className={({ isActive }) => `mobile-nav-link ${isActive ? 'active' : ''}`}>
            <Icon name={item.icon} size={20} />
            <span>{item.label}</span>
          </NavLink>
        ))}
      </nav>

      <main className="main-content">
        {codeRejected && (
          <div
            role="alert"
            style={{
              margin: '0 0 1rem',
              padding: '0.75rem 1rem',
              borderRadius: 'var(--radius)',
              border: '1px solid var(--orange)',
              background: 'rgba(245, 158, 11, 0.12)',
              color: 'var(--text-primary)',
              fontSize: '0.9rem',
              lineHeight: 1.5,
            }}
          >
            <strong>Code d'accès IA manquant ou incorrect.</strong> La voix HD, la transcription et le coach IA sont
            désactivés (la voix du navigateur prend le relais). <NavLink to="/reglages" style={{ color: 'var(--violet-light)', fontWeight: 700 }}>Saisir le code dans Réglages</NavLink>
          </div>
        )}
        <Outlet />
      </main>
    </div>
  );
}

export default AppLayout;
