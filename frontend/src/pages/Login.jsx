import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const submit = async (e) => {
    e.preventDefault();
    setError(''); setLoading(true);
    try {
      const u = await login(email, password);
      navigate(u.role === 'admin' ? '/admin' : '/membre');
    } catch (err) {
      setError(err.message || 'Identifiants invalides');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ minHeight: '100dvh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'linear-gradient(135deg, #eef2ff 0%, #faf5ff 100%)', fontFamily: "'DM Sans','Segoe UI',sans-serif", padding: 20 }}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&display=swap'); * { box-sizing: border-box; }`}</style>
      <div style={{ background: '#fff', borderRadius: 16, padding: '36px 40px', width: '100%', maxWidth: 400, boxShadow: '0 20px 60px rgba(79,70,229,.12)' }}>
        <div style={{ textAlign: 'center', marginBottom: 28 }}>
          <div style={{ width: 52, height: 52, background: '#4f46e5', borderRadius: 14, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: 26, marginBottom: 14 }}>🤝</div>
          <h1 style={{ fontSize: 20, fontWeight: 700, color: '#111827', margin: '0 0 4px' }}>Association d'entraide</h1>
          <p style={{ fontSize: 13, color: '#6b7280', margin: 0 }}>Connexion sécurisée</p>
        </div>

        {error && (
          <div style={{ background: '#fee2e2', color: '#7f1d1d', borderRadius: 8, padding: '10px 14px', fontSize: 13, marginBottom: 16 }}>{error}</div>
        )}

        <form onSubmit={submit}>
          <div style={{ marginBottom: 14 }}>
            <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#374151', marginBottom: 5 }}>Adresse e-mail</label>
            <input type="email" value={email} onChange={e => setEmail(e.target.value)} required placeholder="votre@email.com"
              style={{ width: '100%', padding: '10px 14px', fontSize: 14, border: '1.5px solid #e5e7eb', borderRadius: 9, fontFamily: 'inherit', outline: 'none' }} />
          </div>
          <div style={{ marginBottom: 20 }}>
            <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#374151', marginBottom: 5 }}>Mot de passe</label>
            <input type="password" value={password} onChange={e => setPassword(e.target.value)} required placeholder="••••••••"
              style={{ width: '100%', padding: '10px 14px', fontSize: 14, border: '1.5px solid #e5e7eb', borderRadius: 9, fontFamily: 'inherit', outline: 'none' }} />
          </div>
          <button type="submit" disabled={loading} style={{ width: '100%', padding: '11px', fontSize: 14, fontWeight: 600, background: loading ? '#a5b4fc' : '#4f46e5', color: '#fff', border: 'none', borderRadius: 9, cursor: loading ? 'not-allowed' : 'pointer', fontFamily: 'inherit' }}>
            {loading ? 'Connexion…' : 'Se connecter'}
          </button>
        </form>

        <div style={{ marginTop: 20, padding: '14px', background: '#f8fafc', borderRadius: 9, fontSize: 11, color: '#6b7280', lineHeight: 1.7 }}>
          <strong style={{ color: '#374151' }}>Comptes de démo :</strong><br />
          Admin : admin@association.local / Admin123!<br />
          Membre : membre@association.local / Member123!
        </div>
      </div>
    </div>
  );
}
