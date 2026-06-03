import { useEffect, useState } from 'react';
import { api } from '../lib/api';
import { Card, StatusBadge, SectionTitle, Btn, Input, Textarea, Select, Toast, fmtDate } from '../components/UI';

export default function AdminEvents() {
  const [data, setData] = useState({ events: [], life_events: [], registrations: [] });
  const [tab, setTab] = useState('cohesion');
  const [toast, setToast] = useState(null);
  const [form, setForm] = useState({ title: '', event_date: '', location: '', capacity: '40', description: '' });

  const load = () => api.adminEvents().then(setData).catch(() => {});
  useEffect(() => { load(); }, []);

  const createEvent = async (e) => {
    e.preventDefault();
    try {
      await api.adminCreateEvent(form);
      setToast({ msg: 'Événement créé.', type: 'ok' });
      setForm({ title: '', event_date: '', location: '', capacity: '40', description: '' });
      load();
    } catch (err) { setToast({ msg: err.message, type: 'error' }); }
  };

  const updateLifeEvent = async (id, status) => {
    try {
      await api.adminUpdateLifeEvent(id, { status });
      setToast({ msg: 'Statut mis à jour.', type: 'ok' });
      load();
    } catch (err) { setToast({ msg: err.message, type: 'error' }); }
  };

  const tabStyle = (t) => ({
    padding: '8px 18px', fontSize: 13, cursor: 'pointer', fontFamily: 'inherit',
    border: 'none', borderBottom: tab === t ? '2px solid #4f46e5' : '2px solid transparent',
    background: 'none', color: tab === t ? '#4f46e5' : '#6b7280', fontWeight: tab === t ? 600 : 400,
  });

  return (
    <div>
      <Toast msg={toast?.msg} type={toast?.type} onClose={() => setToast(null)} />
      <h2 style={{ fontSize: 20, fontWeight: 700, color: '#111827', marginBottom: 20, marginTop: 0 }}>Événements</h2>

      <div style={{ display: 'flex', borderBottom: '1px solid #e5e7eb', marginBottom: 20 }}>
        <button style={tabStyle('cohesion')} onClick={() => setTab('cohesion')}>🎉 Cohésion</button>
        <button style={tabStyle('life')} onClick={() => setTab('life')}>❤️ Événements de vie</button>
        <button style={tabStyle('registrations')} onClick={() => setTab('registrations')}>📋 Inscriptions</button>
      </div>

      {tab === 'cohesion' && (
        <>
          <Card style={{ marginBottom: 16 }}>
            <SectionTitle>Créer un événement</SectionTitle>
            <form onSubmit={createEvent}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 12 }}>
                <Input label="Titre" value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} required />
                <Input label="Date" type="date" value={form.event_date} onChange={e => setForm({ ...form, event_date: e.target.value })} required />
                <Input label="Lieu" value={form.location} onChange={e => setForm({ ...form, location: e.target.value })} required />
                <Input label="Capacité" type="number" value={form.capacity} onChange={e => setForm({ ...form, capacity: e.target.value })} required />
              </div>
              <Textarea label="Description" value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} placeholder="Description de l'événement..." />
              <Btn type="submit" variant="primary">Créer l'événement</Btn>
            </form>
          </Card>
          <Card>
            <table>
              <thead><tr><th>Titre</th><th>Date</th><th>Lieu</th><th>Capacité</th><th>Inscrits</th></tr></thead>
              <tbody>
                {data.events.length === 0 && <tr><td colSpan={5} style={{ color: '#9ca3af', textAlign: 'center', padding: 24 }}>Aucun événement.</td></tr>}
                {data.events.map(ev => (
                  <tr key={ev.id}>
                    <td style={{ fontWeight: 500 }}>{ev.title}</td>
                    <td>{fmtDate(ev.event_date)}</td>
                    <td style={{ color: '#6b7280' }}>{ev.location}</td>
                    <td>{ev.capacity}</td>
                    <td><span style={{ fontWeight: 600, color: ev.registrations >= ev.capacity ? '#ef4444' : '#059669' }}>{ev.registrations}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>
        </>
      )}

      {tab === 'life' && (
        <Card>
          <table>
            <thead><tr><th>Membre</th><th>Type</th><th>Date</th><th>Description</th><th>Statut</th><th>Action</th></tr></thead>
            <tbody>
              {data.life_events.length === 0 && <tr><td colSpan={6} style={{ color: '#9ca3af', textAlign: 'center', padding: 24 }}>Aucun événement de vie.</td></tr>}
              {data.life_events.map(ev => (
                <tr key={ev.id}>
                  <td>{ev.first_name} {ev.last_name}</td>
                  <td style={{ textTransform: 'capitalize' }}>{ev.event_type}</td>
                  <td>{fmtDate(ev.event_date)}</td>
                  <td style={{ color: '#6b7280', maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{ev.description || '—'}</td>
                  <td><StatusBadge status={ev.status} /></td>
                  <td>
                    <select value={ev.status} onChange={e => updateLifeEvent(ev.id, e.target.value)}
                      style={{ fontSize: 12, padding: '4px 8px', border: '1px solid #d1d5db', borderRadius: 6, fontFamily: 'inherit', cursor: 'pointer' }}>
                      <option value="en_attente">En attente</option>
                      <option value="approuve">Approuvé</option>
                      <option value="refuse">Refusé</option>
                    </select>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}

      {tab === 'registrations' && (
        <Card>
          <table>
            <thead><tr><th>Événement</th><th>Membre</th><th>Statut</th></tr></thead>
            <tbody>
              {data.registrations.length === 0 && <tr><td colSpan={3} style={{ color: '#9ca3af', textAlign: 'center', padding: 24 }}>Aucune inscription.</td></tr>}
              {data.registrations.map(r => (
                <tr key={r.id}>
                  <td style={{ fontWeight: 500 }}>{r.title}</td>
                  <td>{r.first_name} {r.last_name}</td>
                  <td><StatusBadge status={r.status} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}
    </div>
  );
}
