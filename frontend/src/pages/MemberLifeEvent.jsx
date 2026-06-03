import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../lib/api';
import { Card, SectionTitle, Btn, Input, Select, Textarea, Toast } from '../components/UI';

export default function MemberLifeEvent() {
  const navigate = useNavigate();
  const [toast, setToast] = useState(null);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({ event_type: 'naissance', event_date: '', description: '' });

  const submit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await api.memberNewLifeEvent(form);
      setToast({ msg: 'Déclaration enregistrée. L\'administration examinera votre dossier.', type: 'ok' });
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
      <h2 style={{ fontSize: 20, fontWeight: 700, color: '#111827', marginBottom: 20, marginTop: 0 }}>Déclarer un événement de vie</h2>

      <Card style={{ maxWidth: 500 }}>
        <SectionTitle>Nouvelle déclaration</SectionTitle>
        <form onSubmit={submit}>
          <Select label="Type d'événement" value={form.event_type} onChange={e => setForm({ ...form, event_type: e.target.value })}>
            <option value="naissance">Naissance</option>
            <option value="mariage">Mariage</option>
            <option value="deces">Décès</option>
            <option value="maladie">Maladie</option>
            <option value="autre">Autre</option>
          </Select>

          <Input label="Date de l'événement" type="date" value={form.event_date} onChange={e => setForm({ ...form, event_date: e.target.value })} required />

          <Textarea label="Description" value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} placeholder="Décrivez brièvement l'événement..." />

          <div style={{ marginBottom: 14 }}>
            <label style={{ display: 'block', fontSize: 12, color: '#6b7280', marginBottom: 4 }}>Justificatif (optionnel)</label>
            <input type="file" accept=".pdf,.png,.jpg,.jpeg" style={{ fontSize: 13, fontFamily: 'inherit' }} />
            <p style={{ fontSize: 11, color: '#9ca3af', marginTop: 4 }}>L'envoi de pièce jointe sera disponible après le déploiement.</p>
          </div>

          <div style={{ display: 'flex', gap: 10 }}>
            <Btn type="submit" variant="primary" disabled={loading}>{loading ? 'Envoi…' : 'Enregistrer la déclaration'}</Btn>
            <Btn onClick={() => navigate('/membre')}>Annuler</Btn>
          </div>
        </form>
      </Card>
    </div>
  );
}
