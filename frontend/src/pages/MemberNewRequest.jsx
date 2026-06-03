import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../lib/api';
import { Card, SectionTitle, Btn, Input, Select, Textarea, Toast } from '../components/UI';

export default function MemberNewRequest() {
  const navigate = useNavigate();
  const [toast, setToast] = useState(null);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({ type: 'pret', title: '', amount: '', reason: '', desired_months: '' });

  const submit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await api.memberNewRequest({
        ...form,
        amount: form.amount ? parseFloat(form.amount) : null,
        desired_months: form.type === 'pret' && form.desired_months ? parseInt(form.desired_months) : null,
      });
      setToast({ msg: 'Demande soumise avec succès. L\'admin examinera votre dossier.', type: 'ok' });
      setTimeout(() => navigate('/membre'), 2000);
    } catch (err) {
      setToast({ msg: err.message, type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <Toast msg={toast?.msg} type={toast?.type} onClose={() => setToast(null)} />
      <h2 style={{ fontSize: 20, fontWeight: 700, color: '#111827', marginBottom: 20, marginTop: 0 }}>Nouvelle demande de soutien</h2>

      <Card style={{ maxWidth: 560 }}>
        <SectionTitle>Formulaire de demande</SectionTitle>
        <form onSubmit={submit}>
          <Select label="Type de demande" value={form.type} onChange={e => setForm({ ...form, type: e.target.value })}>
            <option value="pret">Prêt d'honneur</option>
            <option value="sinistre">Sinistre / aide exceptionnelle</option>
          </Select>

          <Input label="Intitulé de la demande" value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} placeholder="Ex : Aide frais médicaux urgents" required />

          <Input label="Montant souhaité (€)" type="number" value={form.amount} onChange={e => setForm({ ...form, amount: e.target.value })} placeholder="300" step="0.01" min="0" />

          {form.type === 'pret' && (
            <Input label="Durée de remboursement (mois)" type="number" value={form.desired_months} onChange={e => setForm({ ...form, desired_months: e.target.value })} placeholder="3" min="1" max="24" />
          )}

          <Textarea label="Motif détaillé" value={form.reason} onChange={e => setForm({ ...form, reason: e.target.value })} placeholder="Expliquez votre situation, le contexte et l'utilisation prévue des fonds..." required />

          <div style={{ marginBottom: 14 }}>
            <label style={{ display: 'block', fontSize: 12, color: '#6b7280', marginBottom: 4 }}>Justificatif (PDF, PNG, JPG) — optionnel</label>
            <input type="file" accept=".pdf,.png,.jpg,.jpeg" style={{ fontSize: 13, fontFamily: 'inherit' }} />
            <p style={{ fontSize: 11, color: '#9ca3af', marginTop: 4 }}>L'envoi de pièce jointe sera disponible après le déploiement.</p>
          </div>

          <div style={{ display: 'flex', gap: 10 }}>
            <Btn type="submit" variant="primary" disabled={loading}>{loading ? 'Envoi…' : 'Soumettre la demande'}</Btn>
            <Btn onClick={() => navigate('/membre')}>Annuler</Btn>
          </div>
        </form>
      </Card>
    </div>
  );
}
