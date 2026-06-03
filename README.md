# 🤝 Association d'entraide — Application Web & Mobile

Application complète de gestion d'association avec espace admin et espace membre.  
**Frontend** → Netlify · **Backend** → Render.com · **Base de données** → Supabase (PostgreSQL)

---

## 📁 Structure du projet

```
association-app/
├── frontend/          → Application React (Netlify)
├── backend/           → API Flask (Render)
└── docker-compose.yml → Développement local
```

---

## 🚀 Déploiement en production (3 étapes)

### Étape 1 — Créer la base de données sur Supabase

1. Créez un compte sur [supabase.com](https://supabase.com)
2. Créez un nouveau projet
3. Dans **Settings > Database**, copiez la **Connection string (URI)**  
   Elle ressemble à : `postgresql://postgres:[password]@db.[ref].supabase.co:5432/postgres`
4. Gardez cette URL pour l'étape 2

---

### Étape 2 — Déployer le backend sur Render.com

1. Créez un compte sur [render.com](https://render.com)
2. **New > Web Service** → connectez votre dépôt GitHub
3. Configurez :
   - **Root Directory** : `backend`
   - **Runtime** : `Docker`
   - **Plan** : Free
4. Ajoutez les variables d'environnement :

| Variable | Valeur |
|----------|--------|
| `DATABASE_URL` | URL Supabase de l'étape 1 |
| `SECRET_KEY` | Générez une chaîne aléatoire longue |
| `FRONTEND_URL` | `https://votre-app.netlify.app` (à renseigner après l'étape 3) |

5. Cliquez **Deploy** — Render construit l'image Docker et démarre l'API
6. Notez l'URL de votre API : `https://association-api.onrender.com`

> 💡 Au premier démarrage, l'API initialise automatiquement les tables et insère les données de démo.

---

### Étape 3 — Déployer le frontend sur Netlify

1. Créez un compte sur [netlify.com](https://netlify.com)
2. **Add new site > Import from Git** → connectez votre dépôt GitHub
3. Configurez :
   - **Base directory** : `frontend`
   - **Build command** : `npm run build`
   - **Publish directory** : `frontend/build`
4. Ajoutez la variable d'environnement :

| Variable | Valeur |
|----------|--------|
| `REACT_APP_API_URL` | URL Render de l'étape 2, ex: `https://association-api.onrender.com` |

5. Cliquez **Deploy site**
6. Retournez sur Render et mettez à jour `FRONTEND_URL` avec l'URL Netlify

---

## 💻 Développement local (Docker)

```bash
# Clonez le projet
git clone https://github.com/votre-compte/association-app.git
cd association-app

# Lancez tout d'un coup
docker compose up

# Frontend : http://localhost:3000
# API      : http://localhost:5000
# Base DB  : localhost:5432
```

---

## 🔑 Comptes de démo

| Rôle | Email | Mot de passe |
|------|-------|-------------|
| Admin | admin@association.local | Admin123! |
| Membre | membre@association.local | Member123! |

---

## ✨ Fonctionnalités

### 👤 Espace Admin
- Tableau de bord avec statistiques en temps réel
- Gestion des membres (création, liste)
- Cotisations : saisie, historique, export CSV
- Dossiers de soutien : validation avec notes, échéancier de remboursement
- Événements de cohésion : création, inscriptions
- Événements de vie : validation des déclarations

### 👥 Espace Membre
- Tableau de bord personnel
- Consultation des cotisations et solde de prêt
- Soumission de demandes (prêt d'honneur / sinistre)
- Déclaration d'événements de vie
- Inscription aux activités associatives

### 📱 Mobile
- Interface responsive (sidebar masquée sur mobile, menu hamburger)
- PWA installable sur iOS et Android
- Optimisé pour les petits écrans

---

## 🛠 Stack technique

| Couche | Technologie |
|--------|-------------|
| Frontend | React 18, React Router 6, Recharts |
| Backend | Flask 3, Flask-Login, Flask-CORS, Gunicorn |
| Base de données | PostgreSQL (Supabase) |
| Conteneur | Docker |
| Hébergement frontend | Netlify |
| Hébergement backend | Render.com |

---

## 🔧 Variables d'environnement

### Backend (`backend/.env`)
```env
SECRET_KEY=votre-cle-secrete-aleatoire
DATABASE_URL=postgresql://user:pass@host:5432/db
FRONTEND_URL=https://votre-app.netlify.app
PORT=5000
```

### Frontend (`frontend/.env.local`)
```env
REACT_APP_API_URL=http://localhost:5000
```
