import { useEffect, useState } from 'react';
import { api } from '../lib/api';
import { Card, StatusBadge, SectionTitle, Btn, Select, Textarea, Toast, fmt, fmtDate } from '../components/UI';

export default function AdminRequests() {
  const [data, setData] = useState({ requests: [], schedules: {} });
  const [toast, setToast] = useState(null);
  const [open, setOpen] = useState(null);
  const [decision, setDecision] = useState({ status: 'approuve', admin_note: '' });

  const load = () => api.adminRequests().then(setData).catch(() => {});
  useEffect(() => { load(); }, []);

  const openDecision = (req) => {
    setOpen(req.id === open ? null : req.id);
    setDecision({ status: req.status === 'en_attente' ? 'approuve' : req.status, admin_note: req.admin_note || '' });
  };

  const saveDecision = async (reqId) => {
    try {
      await api.adminUpdateRequest(reqId, decision);
      setToast({ msg: 'Décision enregistrée.', type: 'ok' });
      setOpen(null);
      load();
    } catch (err) {
      setToast({ msg: err.message, type: 'error' });
    }
  };

  const markPaid = async (reqId, instId) => {
    try {
      await api.adminMarkInstallmentPaid(reqId, instId);
      setToast({ msg: 'Mensualité marquée comme payée.', type: 'ok' });
      load();
    } catch (err) {
      setToast({ msg: err.message, type: 'error' });
    }
  };

  return (
    <div>
      <Toast msg={toast?.msg} type={toast?.type} onClose={() => setToast(null)} />
      <h2 style={{ fontSize: 20, fontWeight: 700, color: '#111827', marginBottom: 20, marginTop: 0 }}>Dossiers de soutien</h2>

      {data.requests.length === 0 && (
        <Card><p style={{ color: '#9ca3af', fontSize: 13 }}>Aucun dossier.</p></Card>
      )}

      {data.requests.map(req => (
        <Card key={req.id} style={{ marginBottom: 14 }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10 }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                <StatusBadge status={req.type} />
                <span style={{ fontSize: 14, fontWeight: 600, color: '#111827' }}>{req.title}</span>
              </div>
              <div style={{ fontSize: 12, color: '#6b7280' }}>
                {req.first_name} {req.last_name} · {fmt(req.amount)}{req.desired_months ? ` · ${req.desired_months} mois` : ''} · {fmtDate(req.created_at)}
              </div>
              {req.admin_note && <div style={{ fontSize: 12, color: '#4f46e5', marginTop: 4 }}>Note : {req.admin_note}</div>}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <StatusBadge status={req.status} />
              <Btn size="sm" onClick={() => openDecision(req)}>✏️ Décider</Btn>
            </div>
          </div>

          {open === req.id && (
            <div style={{ marginTop: 14, paddingTop: 14, borderTop: '1px solid #e5e7eb' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: 12 }}>
                <Select label="Nouveau statut" value={decision.status} onChange={e => setDecision({ ...decision, status: e.target.value })}>
                  <option value="approuve">Approuvé</option>
                  <option value="refuse">Refusé</option>
                  <option value="precisions">Précisions requises</option>
                  <option value="en_attente">En attente</option>
                </Select>
                <Textarea label="Note admin" value={decision.admin_note} onChange={e => setDecision({ ...decision, admin_note: e.target.value })} placeholder="Commentaire..." />
              </div>
              <Btn variant="primary" size="sm" onClick={() => saveDecision(req.id)}>✅ Enregistrer la décision</Btn>
            </div>
          )}

          {req.type === 'pret' && data.schedules[req.id]?.length > 0 && (
            <div style={{ marginTop: 14 }}>
              <div style={{ fontSize: 12, fontWeight: 600, color: '#374151', marginBottom: 8 }}>Échéancier de remboursement</div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                {data.schedules[req.id].map(inst => (
                  <div key={inst.id} style={{ background: inst.status === 'paye' ? '#f0fdf4' : '#fffbeb', border: `1px solid ${inst.status === 'paye' ? '#bbf7d0' : '#fde68a'}`, borderRadius: 8, padding: '8px 12px', fontSize: 12, display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span>{fmtDate(inst.due_date)} · {fmt(inst.amount)}</span>
                    <StatusBadge status={inst.status} />
                    {inst.status === 'a_payer' && (
                      <Btn size="sm" variant="ghost" onClick={() => markPaid(req.id, inst.id)}>Marquer payé</Btn>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </Card>
      ))}
    </div>
  );
}
