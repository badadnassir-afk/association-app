import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './hooks/useAuth';
import Layout from './components/Layout';
import Login from './pages/Login';
import AdminDashboard from './pages/AdminDashboard';
import AdminMembers from './pages/AdminMembers';
import AdminContributions from './pages/AdminContributions';
import AdminRequests from './pages/AdminRequests';
import AdminEvents from './pages/AdminEvents';
import MemberDashboard from './pages/MemberDashboard';
import MemberNewRequest from './pages/MemberNewRequest';
import MemberLifeEvent from './pages/MemberLifeEvent';
import MemberActivities from './pages/MemberActivities';
import Profile from './pages/Profile';

function RequireAuth({ children, role }) {
  const { user, loading } = useAuth();
  if (loading) return <div style={{ display: 'flex', height: '100vh', alignItems: 'center', justifyContent: 'center', color: '#6b7280', fontFamily: 'DM Sans, sans-serif' }}>Chargement…</div>;
  if (!user) return <Navigate to="/login" replace />;
  if (role && user.role !== role) return <Navigate to={user.role === 'admin' ? '/admin' : '/membre'} replace />;
  return children;
}

function AppRoutes() {
  const { user, loading } = useAuth();
  if (loading) return null;

  return (
    <Routes>
      <Route path="/login" element={!user ? <Login /> : <Navigate to={user.role === 'admin' ? '/admin' : '/membre'} replace />} />

      {/* Admin routes */}
      <Route path="/admin" element={<RequireAuth role="admin"><Layout><AdminDashboard /></Layout></RequireAuth>} />
      <Route path="/admin/membres" element={<RequireAuth role="admin"><Layout><AdminMembers /></Layout></RequireAuth>} />
      <Route path="/admin/cotisations" element={<RequireAuth role="admin"><Layout><AdminContributions /></Layout></RequireAuth>} />
      <Route path="/admin/dossiers" element={<RequireAuth role="admin"><Layout><AdminRequests /></Layout></RequireAuth>} />
      <Route path="/admin/evenements" element={<RequireAuth role="admin"><Layout><AdminEvents /></Layout></RequireAuth>} />

      {/* Member routes */}
      <Route path="/membre" element={<RequireAuth role="user"><Layout><MemberDashboard /></Layout></RequireAuth>} />
      <Route path="/membre/demande" element={<RequireAuth role="user"><Layout><MemberNewRequest /></Layout></RequireAuth>} />
      <Route path="/membre/vie" element={<RequireAuth role="user"><Layout><MemberLifeEvent /></Layout></RequireAuth>} />
      <Route path="/membre/activites" element={<RequireAuth role="user"><Layout><MemberActivities /></Layout></RequireAuth>} />

      {/* Shared */}
      <Route path="/profil" element={<RequireAuth><Layout><Profile /></Layout></RequireAuth>} />

      {/* Default */}
      <Route path="/" element={<Navigate to="/login" replace />} />
      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </BrowserRouter>
  );
}
