import { useEffect, useState } from 'react';
import { api } from '../lib/api';
import { Card, StatCard, StatusBadge, SectionTitle, fmt, fmtDate } from '../components/UI';

export default function AdminDashboard() {
  const [data, setData] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    api.adminDashboard().then(setData).catch(e => setError(e.message));
  }, []);

  if (error) return <div style={{ color: '#ef4444', padding: 20 }}>Erreur : {error}</div>;
  if (!data) return <div style={{ padding: 20, color: '#6b7280' }}>Chargement…</div>;

  const { stats, overdue, recent_requests, recent_life_events, current_month } = data;

  return (
    <div>
      <h2 style={{ fontSize: 20, fontWeight: 700, color: '#111827', marginBottom: 20, marginTop: 0 }}>Tableau de bord</h2>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 12, marginBottom: 24 }}>
        <StatCard label="Membres actifs" value={stats.members} sub="cotisants enregistrés" icon="👥" />
        <StatCard label="Cotisations reçues" value={fmt(stats.contributions_total)} sub="cumulé à ce jour" icon="💰" />
        <StatCard label="Prêts approuvés en cours" value={fmt(stats.active_loans)} sub="encours total" icon="💳" />
        <StatCard label="Dossiers en attente" value={stats.pending_cases} sub="à traiter" icon="⏳" />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
        <Card>
          <SectionTitle>Demandes récentes</SectionTitle>
          {recent_requests.length === 0 ? (
            <p style={{ fontSize: 13, color: '#9ca3af' }}>Aucune demande.</p>
          ) : (
            <table>
              <thead><tr><th>Membre</th><th>Type</th><th>Statut</th></tr></thead>
              <tbody>
                {recent_requests.map(r => (
                  <tr key={r.id}>
                    <td>{r.first_name} {r.last_name}</td>
                    <td><StatusBadge status={r.type} /></td>
                    <td><StatusBadge status={r.status} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </Card>

        <Card>
          <SectionTitle>Événements de vie récents</SectionTitle>
          {recent_life_events.length === 0 ? (
            <p style={{ fontSize: 13, color: '#9ca3af' }}>Aucun événement.</p>
          ) : (
            <table>
              <thead><tr><th>Membre</th><th>Type</th><th>Statut</th></tr></thead>
              <tbody>
                {recent_life_events.map(e => (
                  <tr key={e.id}>
                    <td>{e.first_name} {e.last_name}</td>
                    <td style={{ textTransform: 'capitalize' }}>{e.event_type}</td>
                    <td><StatusBadge status={e.status} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </Card>
      </div>

      <Card>
        <SectionTitle>⚠️ Cotisations impayées — {current_month}</SectionTitle>
        {overdue.length === 0 ? (
          <p style={{ fontSize: 13, color: '#6b7280' }}>✅ Aucun membre en retard ce mois-ci.</p>
        ) : (
          <table>
            <thead><tr><th>Nom</th><th>Email</th></tr></thead>
            <tbody>
              {overdue.map(u => (
                <tr key={u.id} style={{ background: '#fff7ed' }}>
                  <td>{u.first_name} {u.last_name}</td>
                  <td style={{ color: '#6b7280' }}>{u.email}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>
    </div>
  );
}
