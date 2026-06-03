import { useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { Avatar } from './UI';

const adminNav = [
  { to: '/admin', label: 'Tableau de bord', icon: '⊞', end: true },
  { to: '/admin/membres', label: 'Membres', icon: '👥' },
  { to: '/admin/cotisations', label: 'Cotisations', icon: '💰' },
  { to: '/admin/dossiers', label: 'Dossiers', icon: '📋' },
  { to: '/admin/evenements', label: 'Événements', icon: '📅' },
];

const memberNav = [
  { to: '/membre', label: 'Mon tableau de bord', icon: '⊞', end: true },
  { to: '/membre/demande', label: 'Nouvelle demande', icon: '➕' },
  { to: '/membre/vie', label: 'Événement de vie', icon: '❤️' },
  { to: '/membre/activites', label: 'Activités', icon: '🎉' },
];

export default function Layout({ children }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const nav = user?.role === 'admin' ? adminNav : memberNav;

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const linkStyle = (active) => ({
    display: 'flex', alignItems: 'center', gap: 10,
    padding: '9px 16px', fontSize: 13, textDecoration: 'none',
    color: active ? '#4f46e5' : '#374151',
    background: active ? '#eef2ff' : 'transparent',
    borderLeft: active ? '3px solid #4f46e5' : '3px solid transparent',
    borderRadius: '0 8px 8px 0',
    fontWeight: active ? 600 : 400,
    transition: 'background .15s',
  });

  const Sidebar = () => (
    <aside style={{
      width: 220, background: '#fff', borderRight: '1px solid #e5e7eb',
      display: 'flex', flexDirection: 'column', height: '100%', flexShrink: 0,
    }}>
      <div style={{ padding: '20px 20px 12px', borderBottom: '1px solid #e5e7eb' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ width: 34, height: 34, background: '#4f46e5', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, color: '#fff' }}>🤝</div>
          <div>
            <div style={{ fontSize: 13, fontWeight: 700, color: '#111827', lineHeight: 1.2 }}>Association</div>
            <div style={{ fontSize: 11, color: '#6b7280' }}>d'entraide</div>
          </div>
        </div>
      </div>

      <nav style={{ flex: 1, padding: '12px 0', overflowY: 'auto' }}>
        <div style={{ fontSize: 10, fontWeight: 700, color: '#9ca3af', padding: '6px 20px 4px', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
          {user?.role === 'admin' ? 'Administration' : 'Espace membre'}
        </div>
        {nav.map(({ to, label, icon, end }) => (
          <NavLink key={to} to={to} end={end} style={({ isActive }) => linkStyle(isActive)} onClick={() => setOpen(false)}>
            <span style={{ fontSize: 15 }}>{icon}</span> {label}
          </NavLink>
        ))}
        <div style={{ fontSize: 10, fontWeight: 700, color: '#9ca3af', padding: '16px 20px 4px', letterSpacing: '0.08em', textTransform: 'uppercase' }}>Compte</div>
        <NavLink to="/profil" style={({ isActive }) => linkStyle(isActive)} onClick={() => setOpen(false)}>
          <span style={{ fontSize: 15 }}>👤</span> Mon profil
        </NavLink>
      </nav>

      <div style={{ padding: 14, borderTop: '1px solid #e5e7eb' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
          <Avatar name={`${user?.first_name} ${user?.last_name}`} size={30} />
          <div style={{ overflow: 'hidden' }}>
            <div style={{ fontSize: 12, fontWeight: 600, color: '#111827', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{user?.first_name} {user?.last_name}</div>
            <div style={{ fontSize: 11, color: '#6b7280' }}>{user?.role === 'admin' ? 'Admin' : 'Membre'}</div>
          </div>
        </div>
        <button onClick={handleLogout} style={{ width: '100%', padding: '7px', fontSize: 12, background: '#f3f4f6', border: 'none', borderRadius: 8, cursor: 'pointer', color: '#374151', fontFamily: 'inherit' }}>
          🚪 Déconnexion
        </button>
      </div>
    </aside>
  );

  return (
    <div style={{ display: 'flex', height: '100dvh', background: '#f9fafb', fontFamily: "'DM Sans', 'Segoe UI', sans-serif" }}>
      {/* Desktop sidebar */}
      <div style={{ display: 'none' }} className="desktop-sidebar">
        <Sidebar />
      </div>

      {/* Mobile: overlay sidebar */}
      {open && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 50, display: 'flex' }}>
          <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,.4)' }} onClick={() => setOpen(false)} />
          <div style={{ position: 'relative', width: 240, zIndex: 51, height: '100%' }}>
            <Sidebar />
          </div>
        </div>
      )}

      {/* Sidebar always shown on wide screens via CSS */}
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&display=swap');
        @media (min-width: 768px) {
          .desktop-sidebar { display: flex !important; }
          .mobile-topbar { display: none !important; }
        }
        * { box-sizing: border-box; }
        body { margin: 0; }
        ::-webkit-scrollbar { width: 5px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: #d1d5db; border-radius: 99px; }
        table { border-collapse: collapse; width: 100%; }
        th { font-size: 11px; font-weight: 600; color: #6b7280; text-align: left; padding: 8px 12px; border-bottom: 1px solid #e5e7eb; white-space: nowrap; }
        td { font-size: 13px; color: #111827; padding: 10px 12px; border-bottom: 1px solid #f3f4f6; vertical-align: middle; }
        tr:last-child td { border-bottom: none; }
        input:focus, select:focus, textarea:focus { border-color: #6366f1 !important; box-shadow: 0 0 0 3px rgba(99,102,241,.15); }
      `}</style>

      {/* Mobile topbar */}
      <div className="mobile-topbar" style={{ position: 'fixed', top: 0, left: 0, right: 0, zIndex: 40, background: '#fff', borderBottom: '1px solid #e5e7eb', padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 12 }}>
        <button onClick={() => setOpen(true)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 22, lineHeight: 1, padding: 0, color: '#374151' }}>☰</button>
        <span style={{ fontWeight: 700, fontSize: 14, color: '#111827' }}>Association d'entraide</span>
      </div>

      {/* Main content */}
      <main style={{ flex: 1, overflowY: 'auto', paddingTop: 0 }}>
        <div style={{ maxWidth: 960, margin: '0 auto', padding: '24px 20px' }} className="main-content">
          {children}
        </div>
      </main>
    </div>
  );
}
