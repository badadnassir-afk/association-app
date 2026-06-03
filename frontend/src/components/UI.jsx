export function Badge({ children, variant = 'gray' }) {
  const styles = {
    ok:      { background: '#d1fae5', color: '#065f46' },
    danger:  { background: '#fee2e2', color: '#7f1d1d' },
    warn:    { background: '#fef3c7', color: '#78350f' },
    info:    { background: '#dbeafe', color: '#1e3a5f' },
    purple:  { background: '#ede9fe', color: '#3b0764' },
    gray:    { background: '#f3f4f6', color: '#374151' },
    partial: { background: '#fef3c7', color: '#78350f' },
  };
  return (
    <span style={{
      ...styles[variant],
      padding: '2px 10px',
      borderRadius: 999,
      fontSize: 11,
      fontWeight: 600,
      display: 'inline-block',
      whiteSpace: 'nowrap',
    }}>
      {children}
    </span>
  );
}

export function StatusBadge({ status }) {
  const map = {
    actif:      { label: 'Actif', variant: 'ok' },
    inactif:    { label: 'Inactif', variant: 'danger' },
    payee:      { label: 'Payée', variant: 'ok' },
    partielle:  { label: 'Partielle', variant: 'partial' },
    impayee:    { label: 'Impayée', variant: 'danger' },
    en_attente: { label: 'En attente', variant: 'warn' },
    approuve:   { label: 'Approuvé', variant: 'ok' },
    refuse:     { label: 'Refusé', variant: 'danger' },
    precisions: { label: 'Précisions', variant: 'info' },
    present:    { label: 'Présent', variant: 'ok' },
    absent:     { label: 'Absent', variant: 'danger' },
    attente:    { label: 'En attente', variant: 'warn' },
    pret:       { label: 'Prêt', variant: 'info' },
    sinistre:   { label: 'Sinistre', variant: 'purple' },
    a_payer:    { label: 'À payer', variant: 'warn' },
    paye:       { label: 'Payé', variant: 'ok' },
  };
  const { label, variant } = map[status] || { label: status, variant: 'gray' };
  return <Badge variant={variant}>{label}</Badge>;
}

export function Card({ children, style }) {
  return (
    <div style={{
      background: '#fff',
      border: '1px solid #e5e7eb',
      borderRadius: 12,
      padding: '20px 24px',
      ...style,
    }}>
      {children}
    </div>
  );
}

export function StatCard({ label, value, sub, icon }) {
  return (
    <div style={{ background: '#f9fafb', borderRadius: 10, padding: '16px 20px' }}>
      <div style={{ fontSize: 12, color: '#6b7280', marginBottom: 6 }}>{icon} {label}</div>
      <div style={{ fontSize: 26, fontWeight: 700, color: '#111827', lineHeight: 1 }}>{value}</div>
      {sub && <div style={{ fontSize: 11, color: '#9ca3af', marginTop: 4 }}>{sub}</div>}
    </div>
  );
}

export function Btn({ children, onClick, variant = 'default', size = 'md', disabled, style, type = 'button' }) {
  const base = {
    display: 'inline-flex', alignItems: 'center', gap: 6,
    border: 'none', borderRadius: 8, cursor: disabled ? 'not-allowed' : 'pointer',
    fontFamily: 'inherit', fontWeight: 500, transition: 'opacity .15s',
    opacity: disabled ? 0.5 : 1,
  };
  const sizes = { sm: { padding: '5px 12px', fontSize: 12 }, md: { padding: '8px 16px', fontSize: 13 }, lg: { padding: '11px 22px', fontSize: 14 } };
  const variants = {
    default: { background: '#f3f4f6', color: '#111827' },
    primary: { background: '#4f46e5', color: '#fff' },
    danger:  { background: '#ef4444', color: '#fff' },
    ghost:   { background: 'transparent', color: '#4f46e5', border: '1px solid #c7d2fe' },
  };
  return (
    <button type={type} onClick={onClick} disabled={disabled} style={{ ...base, ...sizes[size], ...variants[variant], ...style }}>
      {children}
    </button>
  );
}

export function Input({ label, ...props }) {
  return (
    <div style={{ marginBottom: 14 }}>
      {label && <label style={{ display: 'block', fontSize: 12, color: '#6b7280', marginBottom: 4 }}>{label}</label>}
      <input style={{
        width: '100%', padding: '8px 12px', fontSize: 13,
        border: '1px solid #d1d5db', borderRadius: 8,
        fontFamily: 'inherit', outline: 'none', boxSizing: 'border-box',
      }} {...props} />
    </div>
  );
}

export function Select({ label, children, ...props }) {
  return (
    <div style={{ marginBottom: 14 }}>
      {label && <label style={{ display: 'block', fontSize: 12, color: '#6b7280', marginBottom: 4 }}>{label}</label>}
      <select style={{
        width: '100%', padding: '8px 12px', fontSize: 13,
        border: '1px solid #d1d5db', borderRadius: 8,
        fontFamily: 'inherit', outline: 'none', background: '#fff', boxSizing: 'border-box',
      }} {...props}>
        {children}
      </select>
    </div>
  );
}

export function Textarea({ label, ...props }) {
  return (
    <div style={{ marginBottom: 14 }}>
      {label && <label style={{ display: 'block', fontSize: 12, color: '#6b7280', marginBottom: 4 }}>{label}</label>}
      <textarea style={{
        width: '100%', padding: '8px 12px', fontSize: 13,
        border: '1px solid #d1d5db', borderRadius: 8,
        fontFamily: 'inherit', outline: 'none', resize: 'vertical',
        minHeight: 80, boxSizing: 'border-box',
      }} {...props} />
    </div>
  );
}

export function SectionTitle({ children }) {
  return <h3 style={{ fontSize: 14, fontWeight: 600, color: '#111827', marginBottom: 14, marginTop: 0 }}>{children}</h3>;
}

export function Avatar({ name, size = 32 }) {
  const initials = name?.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase() || '?';
  return (
    <div style={{
      width: size, height: size, borderRadius: '50%',
      background: '#ede9fe', color: '#4f46e5',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontSize: size * 0.35, fontWeight: 700, flexShrink: 0,
    }}>
      {initials}
    </div>
  );
}

export function fmt(val) {
  if (val == null) return '—';
  const n = parseFloat(val);
  if (isNaN(n)) return val;
  return n.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' €';
}

export function fmtDate(val) {
  if (!val) return '—';
  try {
    const d = new Date(val.length === 10 ? val + 'T00:00:00' : val);
    return d.toLocaleDateString('fr-FR');
  } catch { return val; }
}

export function Toast({ msg, type, onClose }) {
  if (!msg) return null;
  const bg = type === 'error' ? '#fee2e2' : '#d1fae5';
  const color = type === 'error' ? '#7f1d1d' : '#065f46';
  return (
    <div style={{
      position: 'fixed', top: 20, right: 20, zIndex: 9999,
      background: bg, color, border: `1px solid ${color}40`,
      borderRadius: 10, padding: '12px 20px', fontSize: 13,
      display: 'flex', alignItems: 'center', gap: 10, maxWidth: 340,
      boxShadow: '0 4px 20px rgba(0,0,0,.1)',
    }}>
      <span style={{ flex: 1 }}>{msg}</span>
      <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color, fontWeight: 700 }}>×</button>
    </div>
  );
}
