import { useEffect, useState } from 'react';
import { api } from '../lib/api';
import { Card, StatusBadge, SectionTitle, Btn, Input, Select, Avatar, Toast, fmtDate } from '../components/UI';

export default function AdminMembers() {
  const [members, setMembers] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [toast, setToast] = useState(null);
  const [form, setForm] = useState({ email: '', password: '', first_name: '', last_name: '', phone: '', joined_at: new Date().toISOString().slice(0, 10) });

  const load = () => api.adminMembers().then(setMembers).catch(() => {});
  useEffect(() => { load(); }, []);

  const submit = async (e) => {
    e.preventDefault();
    try {
      await api.adminCreateMember(form);
      setToast({ msg: 'Membre créé avec succès.', type: 'ok' });
      setShowForm(false);
      setForm({ email: '', password: '', first_name: '', last_name: '', phone: '', joined_at: new Date().toISOString().slice(0, 10) });
      load();
    } catch (err) {
      setToast({ msg: err.message, type: 'error' });
    }
  };

  return (
    <div>
      <Toast msg={toast?.msg} type={toast?.type} onClose={() => setToast(null)} />
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <h2 style={{ fontSize: 20, fontWeight: 700, color: '#111827', margin: 0 }}>Membres</h2>
        <Btn variant="primary" onClick={() => setShowForm(!showForm)}>➕ Ajouter un membre</Btn>
      </div>

      {showForm && (
        <Card style={{ marginBottom: 20 }}>
          <SectionTitle>Nouveau membre</SectionTitle>
          <form onSubmit={submit}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <Input label="Prénom" value={form.first_name} onChange={e => setForm({ ...form, first_name: e.target.value })} required />
              <Input label="Nom" value={form.last_name} onChange={e => setForm({ ...form, last_name: e.target.value })} required />
              <Input label="Email" type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} required />
              <Input label="Mot de passe" type="password" value={form.password} onChange={e => setForm({ ...form, password: e.target.value })} required />
              <Input label="Téléphone" value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} />
              <Input label="Date d'adhésion" type="date" value={form.joined_at} onChange={e => setForm({ ...form, joined_at: e.target.value })} />
            </div>
            <div style={{ display: 'flex', gap: 10 }}>
              <Btn type="submit" variant="primary">Créer le membre</Btn>
              <Btn onClick={() => setShowForm(false)}>Annuler</Btn>
            </div>
          </form>
        </Card>
      )}

      <Card>
        <table>
          <thead><tr><th>Membre</th><th>Email</th><th>Téléphone</th><th>Adhésion</th><th>Statut</th></tr></thead>
          <tbody>
            {members.length === 0 && (
              <tr><td colSpan={5} style={{ color: '#9ca3af', textAlign: 'center', padding: 24 }}>Aucun membre enregistré.</td></tr>
            )}
            {members.map(m => (
              <tr key={m.id}>
                <td>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <Avatar name={`${m.first_name} ${m.last_name}`} size={28} />
                    <span>{m.first_name} {m.last_name}</span>
                  </div>
                </td>
                <td style={{ color: '#6b7280' }}>{m.email}</td>
                <td style={{ color: '#6b7280' }}>{m.phone || '—'}</td>
                <td>{fmtDate(m.joined_at)}</td>
                <td><StatusBadge status={m.status} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </div>
  );
}
