import { useEffect, useState } from 'react';
import { api } from '../lib/api';
import { Card, StatusBadge, SectionTitle, Btn, Input, Select, Toast, fmt, fmtDate } from '../components/UI';

export default function AdminContributions() {
  const [contributions, setContributions] = useState([]);
  const [members, setMembers] = useState([]);
  const [toast, setToast] = useState(null);
  const [form, setForm] = useState({ user_id: '', month: new Date().toISOString().slice(0, 7), amount: '10', status: 'payee', paid_at: new Date().toISOString().slice(0, 10) });

  const load = async () => {
    const [c, m] = await Promise.all([api.adminContributions(), api.adminMembers()]);
    setContributions(c);
    setMembers(m);
    if (m.length && !form.user_id) setForm(f => ({ ...f, user_id: String(m[0].id) }));
  };
  useEffect(() => { load(); }, []);

  const submit = async (e) => {
    e.preventDefault();
    try {
      await api.adminSaveContribution(form);
      setToast({ msg: 'Cotisation enregistrée.', type: 'ok' });
      load();
    } catch (err) {
      setToast({ msg: err.message, type: 'error' });
    }
  };

  return (
    <div>
      <Toast msg={toast?.msg} type={toast?.type} onClose={() => setToast(null)} />
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <h2 style={{ fontSize: 20, fontWeight: 700, color: '#111827', margin: 0 }}>Cotisations</h2>
        <a href={api.exportContributions()} target="_blank" rel="noreferrer">
          <Btn>⬇️ Exporter CSV</Btn>
        </a>
      </div>

      <Card style={{ marginBottom: 20 }}>
        <SectionTitle>Saisir / mettre à jour une cotisation</SectionTitle>
        <form onSubmit={submit}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 12, alignItems: 'flex-end' }}>
            <Select label="Membre" value={form.user_id} onChange={e => setForm({ ...form, user_id: e.target.value })}>
              {members.map(m => <option key={m.id} value={m.id}>{m.first_name} {m.last_name}</option>)}
            </Select>
            <Input label="Mois" type="month" value={form.month} onChange={e => setForm({ ...form, month: e.target.value })} />
            <Input label="Montant (€)" type="number" value={form.amount} onChange={e => setForm({ ...form, amount: e.target.value })} step="0.01" />
            <Select label="Statut" value={form.status} onChange={e => setForm({ ...form, status: e.target.value })}>
              <option value="payee">Payée</option>
              <option value="partielle">Partielle</option>
              <option value="impayee">Impayée</option>
            </Select>
            <Input label="Date paiement" type="date" value={form.paid_at} onChange={e => setForm({ ...form, paid_at: e.target.value })} />
            <div style={{ marginBottom: 14 }}>
              <label style={{ display: 'block', fontSize: 12, color: 'transparent', marginBottom: 4 }}>—</label>
              <Btn type="submit" variant="primary" style={{ width: '100%', justifyContent: 'center' }}>Enregistrer</Btn>
            </div>
          </div>
        </form>
      </Card>

      <Card>
        <SectionTitle>Historique des cotisations</SectionTitle>
        <table>
          <thead><tr><th>Membre</th><th>Mois</th><th>Montant</th><th>Statut</th><th>Date paiement</th></tr></thead>
          <tbody>
            {contributions.length === 0 && (
              <tr><td colSpan={5} style={{ color: '#9ca3af', textAlign: 'center', padding: 24 }}>Aucune cotisation.</td></tr>
            )}
            {contributions.map(c => (
              <tr key={c.id}>
                <td>{c.first_name} {c.last_name}</td>
                <td>{c.month}</td>
                <td>{fmt(c.amount)}</td>
                <td><StatusBadge status={c.status} /></td>
                <td>{fmtDate(c.paid_at)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </div>
  );
}
