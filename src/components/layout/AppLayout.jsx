import { NavLink, Outlet } from 'react-router-dom';
import Icon from '../ui/Icon';
import './Layout.css';

const NAV_ITEMS = [
  { to: '/', icon: 'home', label: 'Accueil' },
  { to: '/entrainement', icon: 'training', label: 'Entraînement' },
  { to: '/progression', icon: 'progress', label: 'Progression' },
  { to: '/historique', icon: 'history', label: 'Historique' },
  { to: '/reglages', icon: 'settings', label: 'Réglages' },
];

export function AppLayout() {
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
        <Outlet />
      </main>
    </div>
  );
}

export default AppLayout;
