import { useAuth } from '../hooks/useAuth';
import { Card, SectionTitle, Avatar, Badge, fmtDate } from '../components/UI';

export default function Profile() {
  const { user } = useAuth();
  if (!user) return null;

  return (
    <div>
      <h2 style={{ fontSize: 20, fontWeight: 700, color: '#111827', marginBottom: 20, marginTop: 0 }}>Mon profil</h2>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 16 }}>
        <Card>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 20 }}>
            <Avatar name={`${user.first_name} ${user.last_name}`} size={54} />
            <div>
              <h3 style={{ margin: '0 0 4px', fontSize: 16, fontWeight: 700, color: '#111827' }}>{user.first_name} {user.last_name}</h3>
              <span style={{ fontSize: 12, color: '#6b7280' }}>{user.email}</span>
            </div>
          </div>

          <table style={{ fontSize: 13 }}>
            <tbody>
              <tr>
                <td style={{ color: '#6b7280', paddingBottom: 10, paddingRight: 16, whiteSpace: 'nowrap' }}>Rôle</td>
                <td style={{ paddingBottom: 10 }}>
                  <Badge variant={user.role === 'admin' ? 'purple' : 'info'}>{user.role === 'admin' ? 'Administrateur' : 'Membre'}</Badge>
                </td>
              </tr>
              <tr>
                <td style={{ color: '#6b7280', paddingBottom: 10, paddingRight: 16 }}>Téléphone</td>
                <td style={{ paddingBottom: 10 }}>{user.phone || '—'}</td>
              </tr>
              <tr>
                <td style={{ color: '#6b7280', paddingBottom: 10, paddingRight: 16 }}>Membre depuis</td>
                <td style={{ paddingBottom: 10 }}>{fmtDate(user.joined_at)}</td>
              </tr>
              <tr>
                <td style={{ color: '#6b7280', paddingRight: 16 }}>Statut</td>
                <td><Badge variant="ok">Actif</Badge></td>
              </tr>
            </tbody>
          </table>
        </Card>

        <Card>
          <SectionTitle>Sécurité</SectionTitle>
          <p style={{ fontSize: 13, color: '#6b7280', marginBottom: 16 }}>
            Pour modifier votre mot de passe, contactez l'administrateur de l'association ou utilisez le formulaire ci-dessous.
          </p>
          <div style={{ background: '#f9fafb', borderRadius: 8, padding: 14, fontSize: 12, color: '#6b7280' }}>
            <strong style={{ color: '#374151' }}>Connexion sécurisée</strong><br />
            Votre session est protégée. Déconnectez-vous après chaque utilisation sur un appareil partagé.
          </div>
        </Card>
      </div>
    </div>
  );
}
