import { useEffect, useState } from 'react';
import { api } from '../lib/api';
import { Card, StatusBadge, SectionTitle, Btn, Toast, fmtDate } from '../components/UI';

export default function MemberActivities() {
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
  const events = data.upcoming_events;

  return (
    <div>
      <Toast msg={toast?.msg} type={toast?.type} onClose={() => setToast(null)} />
      <h2 style={{ fontSize: 20, fontWeight: 700, color: '#111827', marginBottom: 20, marginTop: 0 }}>Activités & Événements</h2>

      {events.length === 0 && (
        <Card><p style={{ fontSize: 13, color: '#9ca3af' }}>Aucun événement à venir.</p></Card>
      )}

      {events.map(ev => {
        const d = new Date(ev.event_date + 'T00:00:00');
        const isPast = d < new Date();
        return (
          <Card key={ev.id} style={{ marginBottom: 14, opacity: isPast ? 0.7 : 1 }}>
            <div style={{ display: 'flex', gap: 16, alignItems: 'flex-start' }}>
              <div style={{ background: isPast ? '#f3f4f6' : '#eef2ff', borderRadius: 10, padding: '10px 14px', textAlign: 'center', minWidth: 52, flexShrink: 0 }}>
                <div style={{ fontSize: 22, fontWeight: 700, color: isPast ? '#6b7280' : '#4f46e5', lineHeight: 1 }}>{d.getDate()}</div>
                <div style={{ fontSize: 10, color: isPast ? '#9ca3af' : '#6366f1', textTransform: 'uppercase' }}>
                  {d.toLocaleDateString('fr-FR', { month: 'short' })}
                </div>
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 8 }}>
                  <div>
                    <h3 style={{ margin: '0 0 4px', fontSize: 15, fontWeight: 600, color: '#111827' }}>{ev.title}</h3>
                    <p style={{ margin: '0 0 4px', fontSize: 12, color: '#6b7280' }}>📍 {ev.location} · {ev.capacity} places max.</p>
                    {ev.description && <p style={{ margin: '0 0 8px', fontSize: 12, color: '#6b7280' }}>{ev.description}</p>}
                  </div>
                  {ev.registration_status && <StatusBadge status={ev.registration_status} />}
                </div>
                {!isPast && (
                  <div style={{ display: 'flex', gap: 8 }}>
                    <Btn size="sm" variant={ev.registration_status === 'present' ? 'primary' : 'ghost'} onClick={() => register(ev.id, 'present')}>✅ Présent</Btn>
                    <Btn size="sm" variant={ev.registration_status === 'absent' ? 'danger' : 'default'} onClick={() => register(ev.id, 'absent')}>❌ Absent</Btn>
                  </div>
                )}
              </div>
            </div>
          </Card>
        );
      })}
    </div>
  );
}
