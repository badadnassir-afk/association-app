import { useEffect, useState } from 'react';
import { api } from '../lib/api';
import { Card, StatCard, StatusBadge, SectionTitle, Btn, Toast, fmt, fmtDate } from '../components/UI';

export default function MemberDashboard() {
  const [data, setData] = useState(null);
  const [toast, setToast] = useState(null);

  const load = () => api.memberDashboard().then(setData).catch(() => {});
  useEffect(() => { load(); }, []);

  const register = async (eventId, status) => {
    try {
      await api.memberRegisterEvent(eventId, status);
      setToast({ msg: 'Inscription mise à jour.', type: 'ok' });
      load();
    } catch (err) { setToast({ msg: err.message, type: 'error' }); }
  };

  if (!data) return <div style={{ padding: 20, color: '#6b7280' }}>Chargement…</div>;

  const { contributions, requests, life_events, upcoming_events, loan_balance } = data;
  const recentContribs = contributions.slice(0, 4);
  const upcomingEvts = upcoming_events.filter(e => new Date(e.event_date) >= new Date());

  return (
    <div>
      <Toast msg={toast?.msg} type={toast?.type} onClose={() => setToast(null)} />
      <h2 style={{ fontSize: 20, fontWeight: 700, color: '#111827', marginBottom: 20, marginTop: 0 }}>Mon tableau de bord</h2>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 12, marginBottom: 24 }}>
        <StatCard label="Cotisations versées" value={contributions.length} sub="mois enregistrés" icon="💰" />
        <StatCard label="Solde prêt restant" value={fmt(loan_balance)} sub="à rembourser" icon="💳" />
        <StatCard label="Mes dossiers" value={requests.length} sub="demandes" icon="📋" />
        <StatCard label="Prochains événements" value={upcomingEvts.length} sub="à venir" icon="📅" />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
        <Card>
          <SectionTitle>Mes cotisations récentes</SectionTitle>
          {recentContribs.length === 0
            ? <p style={{ fontSize: 13, color: '#9ca3af' }}>Aucune cotisation.</p>
            : recentContribs.map(c => (
              <div key={c.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0', borderBottom: '1px solid #f3f4f6' }}>
                <span style={{ fontSize: 13, color: '#374151' }}>{c.month}</span>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                  <StatusBadge status={c.status} />
                  <span style={{ fontSize: 13, fontWeight: 600, color: '#111827' }}>{fmt(c.amount)}</span>
                </div>
              </div>
            ))
          }
        </Card>

        <Card>
          <SectionTitle>Prochains événements</SectionTitle>
          {upcomingEvts.length === 0
            ? <p style={{ fontSize: 13, color: '#9ca3af' }}>Aucun événement à venir.</p>
            : upcomingEvts.map(ev => (
              <div key={ev.id} style={{ display: 'flex', gap: 12, padding: '8px 0', borderBottom: '1px solid #f3f4f6' }}>
                <div style={{ background: '#eef2ff', borderRadius: 8, padding: '8px 10px', textAlign: 'center', minWidth: 44 }}>
                  <div style={{ fontSize: 18, fontWeight: 700, color: '#4f46e5', lineHeight: 1 }}>{new Date(ev.event_date + 'T00:00:00').getDate()}</div>
                  <div style={{ fontSize: 10, color: '#6366f1' }}>{new Date(ev.event_date + 'T00:00:00').toLocaleDateString('fr-FR', { month: 'short' }).toUpperCase()}</div>
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 13, fontWeight: 500, color: '#111827' }}>{ev.title}</div>
                  <div style={{ fontSize: 11, color: '#9ca3af' }}>{ev.location}</div>
                  {ev.registration_status
                    ? <StatusBadge status={ev.registration_status} />
                    : <div style={{ display: 'flex', gap: 6, marginTop: 4 }}>
                        <Btn size="sm" variant="primary" onClick={() => register(ev.id, 'present')}>Présent</Btn>
                        <Btn size="sm" onClick={() => register(ev.id, 'absent')}>Absent</Btn>
                      </div>
                  }
                </div>
              </div>
            ))
          }
        </Card>
      </div>

      <Card>
        <SectionTitle>Mes demandes de soutien</SectionTitle>
        {requests.length === 0
          ? <p style={{ fontSize: 13, color: '#9ca3af' }}>Aucune demande.</p>
          : (
            <table>
              <thead><tr><th>Titre</th><th>Type</th><th>Montant</th><th>Statut</th><th>Note admin</th></tr></thead>
              <tbody>
                {requests.map(r => (
                  <tr key={r.id}>
                    <td style={{ fontWeight: 500 }}>{r.title}</td>
                    <td><StatusBadge status={r.type} /></td>
                    <td>{fmt(r.amount)}</td>
                    <td><StatusBadge status={r.status} /></td>
                    <td style={{ color: '#6b7280', fontSize: 12 }}>{r.admin_note || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )
        }
      </Card>
    </div>
  );
}
