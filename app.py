import os
import secrets
from datetime import date, datetime
from functools import wraps
from math import floor
from uuid import uuid4

from werkzeug.security import check_password_hash, generate_password_hash
from werkzeug.middleware.proxy_fix import ProxyFix
from flask import Flask, abort, flash, g, redirect, render_template, request, jsonify, session, url_for, Response
from flask_login import LoginManager, UserMixin, current_user, login_required, login_user, logout_user
from flask_cors import CORS
import psycopg2
import psycopg2.extras

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DATABASE_URL = os.environ.get('DATABASE_URL')  # Supabase PostgreSQL URL

app = Flask(__name__)
app.config['SECRET_KEY'] = os.environ.get('SECRET_KEY', 'dev-secret-change-me')
app.config['MAX_CONTENT_LENGTH'] = 10 * 1024 * 1024

# ProxyFix : Render utilise un reverse proxy, Flask doit savoir qu'il est derrière HTTPS
app.wsgi_app = ProxyFix(app.wsgi_app, x_proto=1, x_host=1)

# Origines autorisées pour CORS
_cors_origins = [o for o in [os.environ.get('FRONTEND_URL'), 'https://association-app.netlify.app'] if o]
# Fallback pour le développement local
if not _cors_origins:
    _cors_origins = ['http://localhost:3000', 'http://localhost:5000']
CORS(app, origins=_cors_origins, supports_credentials=True)

# Configuration session pour cross-origin (Netlify → Render)
# En production : SameSite=None + Secure pour que le navigateur accepte le cookie
if os.environ.get('FRONTEND_URL'):
    app.config['SESSION_COOKIE_SAMESITE'] = 'None'
    app.config['SESSION_COOKIE_SECURE'] = True

login_manager = LoginManager()
login_manager.login_view = 'login'
login_manager.init_app(app)


class User(UserMixin):
    def __init__(self, row):
        self.id = str(row['id'])
        self.email = row['email']
        self.role = row['role']
        self.first_name = row['first_name']
        self.last_name = row['last_name']
        self.phone = row['phone']
        self.joined_at = str(row['joined_at'])
        self.status = row['status']

    @property
    def full_name(self):
        return f"{self.first_name} {self.last_name}"


def get_db():
    if 'db' not in g:
        g.db = psycopg2.connect(DATABASE_URL + "?sslmode=require", cursor_factory=psycopg2.extras.RealDictCursor)
    return g.db


@app.teardown_appcontext
def close_db(exception=None):
    db = g.pop('db', None)
    if db is not None:
        db.close()


def init_db():
    conn = psycopg2.connect(DATABASE_URL)
    cur = conn.cursor()
    cur.execute("""
        CREATE TABLE IF NOT EXISTS users (
            id SERIAL PRIMARY KEY,
            email TEXT UNIQUE NOT NULL,
            password_hash TEXT NOT NULL,
            role TEXT NOT NULL CHECK(role IN ('admin', 'user')),
            first_name TEXT NOT NULL,
            last_name TEXT NOT NULL,
            phone TEXT,
            joined_at TEXT NOT NULL,
            status TEXT NOT NULL DEFAULT 'actif'
        );
        CREATE TABLE IF NOT EXISTS contributions (
            id SERIAL PRIMARY KEY,
            user_id INTEGER NOT NULL,
            month TEXT NOT NULL,
            amount REAL NOT NULL,
            status TEXT NOT NULL CHECK(status IN ('payee', 'partielle', 'impayee')),
            paid_at TEXT,
            UNIQUE(user_id, month),
            FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
        );
        CREATE TABLE IF NOT EXISTS support_requests (
            id SERIAL PRIMARY KEY,
            user_id INTEGER NOT NULL,
            type TEXT NOT NULL CHECK(type IN ('pret', 'sinistre')),
            title TEXT NOT NULL,
            amount REAL,
            reason TEXT NOT NULL,
            desired_months INTEGER,
            status TEXT NOT NULL DEFAULT 'en_attente' CHECK(status IN ('en_attente', 'approuve', 'refuse', 'precisions')),
            admin_note TEXT,
            document_path TEXT,
            created_at TEXT NOT NULL,
            updated_at TEXT NOT NULL,
            FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
        );
        CREATE TABLE IF NOT EXISTS loan_payments (
            id SERIAL PRIMARY KEY,
            request_id INTEGER NOT NULL,
            due_date TEXT NOT NULL,
            amount REAL NOT NULL,
            status TEXT NOT NULL DEFAULT 'a_payer' CHECK(status IN ('a_payer', 'paye')),
            paid_at TEXT,
            FOREIGN KEY(request_id) REFERENCES support_requests(id) ON DELETE CASCADE
        );
        CREATE TABLE IF NOT EXISTS life_events (
            id SERIAL PRIMARY KEY,
            user_id INTEGER NOT NULL,
            event_type TEXT NOT NULL,
            event_date TEXT NOT NULL,
            description TEXT,
            document_path TEXT,
            status TEXT NOT NULL DEFAULT 'en_attente' CHECK(status IN ('en_attente', 'approuve', 'refuse')),
            created_at TEXT NOT NULL,
            FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
        );
        CREATE TABLE IF NOT EXISTS cohesion_events (
            id SERIAL PRIMARY KEY,
            title TEXT NOT NULL,
            event_date TEXT NOT NULL,
            location TEXT NOT NULL,
            capacity INTEGER NOT NULL,
            description TEXT,
            created_by INTEGER NOT NULL,
            created_at TEXT NOT NULL,
            FOREIGN KEY(created_by) REFERENCES users(id)
        );
        CREATE TABLE IF NOT EXISTS event_registrations (
            id SERIAL PRIMARY KEY,
            event_id INTEGER NOT NULL,
            user_id INTEGER NOT NULL,
            status TEXT NOT NULL CHECK(status IN ('present', 'absent', 'attente')),
            created_at TEXT NOT NULL,
            UNIQUE(event_id, user_id),
            FOREIGN KEY(event_id) REFERENCES cohesion_events(id) ON DELETE CASCADE,
            FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
        );
        CREATE TABLE IF NOT EXISTS audit_logs (
            id SERIAL PRIMARY KEY,
            user_id INTEGER,
            action TEXT NOT NULL,
            entity_type TEXT NOT NULL,
            entity_id TEXT,
            details TEXT,
            created_at TEXT NOT NULL,
            FOREIGN KEY(user_id) REFERENCES users(id)
        );
    """)
    conn.commit()
    conn.close()


def seed_db():
    conn = psycopg2.connect(DATABASE_URL)
    conn.autocommit = False
    cur = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)
    cur.execute("SELECT COUNT(*) AS c FROM users")
    if cur.fetchone()['c'] > 0:
        conn.close()
        return
    cur.execute(
        "INSERT INTO users (email,password_hash,role,first_name,last_name,phone,joined_at,status) VALUES (%s,%s,%s,%s,%s,%s,%s,%s) RETURNING id",
        ('admin@association.local', generate_password_hash('Admin123!'), 'admin', 'Awa', 'Diop', '+221700000001', '2025-01-15', 'actif'),
    )
    admin_id = cur.fetchone()['id']
    cur.execute(
        "INSERT INTO users (email,password_hash,role,first_name,last_name,phone,joined_at,status) VALUES (%s,%s,%s,%s,%s,%s,%s,%s) RETURNING id",
        ('membre@association.local', generate_password_hash('Member123!'), 'user', 'Fatou', 'Ndiaye', '+221700000002', '2025-03-01', 'actif'),
    )
    member_id = cur.fetchone()['id']
    now = datetime.utcnow().strftime('%Y-%m-%d %H:%M:%S')
    for month, status, paid_at in [('2026-03','payee','2026-03-05'),('2026-04','payee','2026-04-06'),('2026-05','partielle','2026-05-20')]:
        cur.execute("INSERT INTO contributions (user_id,month,amount,status,paid_at) VALUES (%s,%s,%s,%s,%s)", (member_id, month, 10.0, status, paid_at))
    cur.execute(
        "INSERT INTO support_requests (user_id,type,title,amount,reason,desired_months,status,admin_note,created_at,updated_at) VALUES (%s,%s,%s,%s,%s,%s,%s,%s,%s,%s)",
        (member_id,'pret','Aide ponctuelle santé',300.0,'Besoin d\'un prêt d\'honneur pour une dépense médicale urgente.',3,'en_attente',None,now,now),
    )
    cur.execute(
        "INSERT INTO life_events (user_id,event_type,event_date,description,status,created_at) VALUES (%s,%s,%s,%s,%s,%s)",
        (member_id,'naissance','2026-05-15','Déclaration de naissance avec justificatif à fournir.','en_attente',now),
    )
    cur.execute(
        "INSERT INTO cohesion_events (title,event_date,location,capacity,description,created_by,created_at) VALUES (%s,%s,%s,%s,%s,%s,%s) RETURNING id",
        ('Teambuilding trimestriel','2026-06-20','Salle polyvalente',40,'Journée de cohésion et activités collectives.',admin_id,now),
    )
    event_id = cur.fetchone()['id']
    cur.execute("INSERT INTO event_registrations (event_id,user_id,status,created_at) VALUES (%s,%s,%s,%s)", (event_id, member_id, 'present', now))
    conn.commit()
    conn.close()


@login_manager.user_loader
def load_user(user_id):
    try:
        db = get_db()
        cur = db.cursor()
        cur.execute('SELECT * FROM users WHERE id = %s', (user_id,))
        row = cur.fetchone()
        return User(row) if row else None
    except Exception:
        return None


def current_ts():
    return datetime.utcnow().strftime('%Y-%m-%d %H:%M:%S')


def month_label():
    return date.today().strftime('%Y-%m')


def add_months(start_date, months_to_add):
    year = start_date.year + (start_date.month - 1 + months_to_add) // 12
    month = (start_date.month - 1 + months_to_add) % 12 + 1
    day = min(start_date.day, [31,29 if year%4==0 and(year%100!=0 or year%400==0) else 28,31,30,31,30,31,31,30,31,30,31][month-1])
    return date(year, month, day)


def create_schedule(request_id, total_amount, months):
    if not months or months <= 0:
        months = 1
    db = get_db()
    cur = db.cursor()
    cur.execute('SELECT COUNT(*) AS c FROM loan_payments WHERE request_id = %s', (request_id,))
    if cur.fetchone()['c']:
        return
    monthly = round(float(total_amount) / months, 2)
    amounts = [monthly] * months
    amounts[-1] = round(float(total_amount) - round(monthly * (months - 1), 2), 2)
    start = date.today().replace(day=5)
    for idx, amount in enumerate(amounts, start=1):
        due = add_months(start, idx)
        cur.execute('INSERT INTO loan_payments (request_id,due_date,amount,status) VALUES (%s,%s,%s,%s)', (request_id, due.isoformat(), amount, 'a_payer'))
    db.commit()


def log_action(action, entity_type, entity_id=None, details=None):
    db = get_db()
    cur = db.cursor()
    cur.execute(
        'INSERT INTO audit_logs (user_id,action,entity_type,entity_id,details,created_at) VALUES (%s,%s,%s,%s,%s,%s)',
        (int(current_user.id) if current_user.is_authenticated else None, action, entity_type, str(entity_id) if entity_id else None, details, current_ts()),
    )
    db.commit()


def role_required(*roles):
    def decorator(fn):
        @wraps(fn)
        def wrapper(*args, **kwargs):
            if not current_user.is_authenticated:
                return jsonify({'error': 'Non authentifié'}), 401
            if current_user.role not in roles:
                return jsonify({'error': 'Accès refusé'}), 403
            return fn(*args, **kwargs)
        return wrapper
    return decorator


# ─── AUTH ───────────────────────────────────────────────────────────────────

@app.route('/api/auth/login', methods=['POST'])
def api_login():
    data = request.get_json()
    email = data.get('email', '').strip().lower()
    password = data.get('password', '')
    db = get_db()
    cur = db.cursor()
    cur.execute('SELECT * FROM users WHERE email = %s', (email,))
    row = cur.fetchone()
    if row and check_password_hash(row['password_hash'], password):
        user = User(row)
        login_user(user, remember=True)
        log_action('connexion', 'auth', user.id, 'Connexion réussie')
        return jsonify({'id': user.id, 'email': user.email, 'role': user.role, 'first_name': user.first_name, 'last_name': user.last_name, 'phone': user.phone, 'joined_at': user.joined_at, 'status': user.status})
    return jsonify({'error': 'Identifiants invalides'}), 401


@app.route('/api/auth/logout', methods=['POST'])
@login_required
def api_logout():
    log_action('deconnexion', 'auth', current_user.id, 'Déconnexion')
    logout_user()
    return jsonify({'ok': True})


@app.route('/api/auth/me')
@login_required
def api_me():
    return jsonify({'id': current_user.id, 'email': current_user.email, 'role': current_user.role, 'first_name': current_user.first_name, 'last_name': current_user.last_name, 'phone': current_user.phone, 'joined_at': current_user.joined_at, 'status': current_user.status})


# ─── ADMIN DASHBOARD ────────────────────────────────────────────────────────

@app.route('/api/admin/dashboard')
@login_required
@role_required('admin')
def api_admin_dashboard():
    db = get_db()
    cur = db.cursor()
    cur.execute("SELECT COUNT(*) AS c FROM users WHERE role='user'"); members = cur.fetchone()['c']
    cur.execute("SELECT COALESCE(SUM(amount),0) AS s FROM contributions WHERE status IN ('payee','partielle')"); contrib = cur.fetchone()['s']
    cur.execute("SELECT COALESCE(SUM(amount),0) AS s FROM support_requests WHERE type='pret' AND status='approuve'"); loans = cur.fetchone()['s']
    cur.execute("SELECT COUNT(*) AS c FROM support_requests WHERE status IN ('en_attente','precisions')"); pending = cur.fetchone()['c']
    cur.execute("SELECT COUNT(*) AS c FROM life_events WHERE status='en_attente'"); life_pending = cur.fetchone()['c']
    cur.execute("""
        SELECT u.id,u.first_name,u.last_name,u.email FROM users u
        WHERE u.role='user' AND u.status='actif'
        AND NOT EXISTS (SELECT 1 FROM contributions c WHERE c.user_id=u.id AND c.month=%s AND c.status IN ('payee','partielle'))
        ORDER BY u.last_name,u.first_name
    """, (month_label(),))
    overdue = [dict(r) for r in cur.fetchall()]
    cur.execute("""
        SELECT sr.*,u.first_name,u.last_name FROM support_requests sr
        JOIN users u ON u.id=sr.user_id ORDER BY sr.created_at DESC LIMIT 5
    """)
    recent_requests = [dict(r) for r in cur.fetchall()]
    cur.execute("""
        SELECT le.*,u.first_name,u.last_name FROM life_events le
        JOIN users u ON u.id=le.user_id ORDER BY le.created_at DESC LIMIT 5
    """)
    recent_life = [dict(r) for r in cur.fetchall()]
    return jsonify({'stats': {'members': members, 'contributions_total': float(contrib), 'active_loans': float(loans), 'pending_cases': pending, 'pending_life_events': life_pending}, 'overdue': overdue, 'current_month': month_label(), 'recent_requests': recent_requests, 'recent_life_events': recent_life})


# ─── MEMBERS ────────────────────────────────────────────────────────────────

@app.route('/api/admin/members')
@login_required
@role_required('admin')
def api_admin_members():
    cur = get_db().cursor()
    cur.execute("SELECT * FROM users WHERE role='user' ORDER BY last_name,first_name")
    return jsonify([dict(r) for r in cur.fetchall()])


@app.route('/api/admin/members', methods=['POST'])
@login_required
@role_required('admin')
def api_admin_create_member():
    data = request.get_json()
    db = get_db()
    cur = db.cursor()
    cur.execute(
        "INSERT INTO users (email,password_hash,role,first_name,last_name,phone,joined_at,status) VALUES (%s,%s,%s,%s,%s,%s,%s,%s) RETURNING id",
        (data['email'], generate_password_hash(data['password']), 'user', data['first_name'], data['last_name'], data.get('phone',''), data.get('joined_at', date.today().isoformat()), 'actif'),
    )
    new_id = cur.fetchone()['id']
    db.commit()
    log_action('creation_membre', 'user', new_id, data['email'])
    return jsonify({'id': new_id}), 201


# ─── CONTRIBUTIONS ──────────────────────────────────────────────────────────

@app.route('/api/admin/contributions')
@login_required
@role_required('admin')
def api_admin_contributions():
    cur = get_db().cursor()
    cur.execute("""
        SELECT c.*,u.first_name,u.last_name FROM contributions c
        JOIN users u ON u.id=c.user_id ORDER BY c.month DESC,u.last_name
    """)
    return jsonify([dict(r) for r in cur.fetchall()])


@app.route('/api/admin/contributions', methods=['POST'])
@login_required
@role_required('admin')
def api_admin_save_contribution():
    data = request.get_json()
    db = get_db()
    cur = db.cursor()
    cur.execute("""
        INSERT INTO contributions (user_id,month,amount,status,paid_at) VALUES (%s,%s,%s,%s,%s)
        ON CONFLICT(user_id,month) DO UPDATE SET amount=EXCLUDED.amount,status=EXCLUDED.status,paid_at=EXCLUDED.paid_at
    """, (data['user_id'], data['month'], float(data['amount']), data['status'], data.get('paid_at')))
    db.commit()
    log_action('mise_a_jour_cotisation','contribution',f"{data['user_id']}-{data['month']}", data['status'])
    return jsonify({'ok': True})


@app.route('/api/admin/contributions/export')
@login_required
@role_required('admin')
def api_export_contributions():
    cur = get_db().cursor()
    cur.execute("""
        SELECT u.first_name,u.last_name,u.email,c.month,c.amount,c.status,COALESCE(c.paid_at,'') AS paid_at
        FROM contributions c JOIN users u ON u.id=c.user_id ORDER BY c.month DESC,u.last_name
    """)
    lines = ['prenom;nom;email;mois;montant;statut;date_paiement']
    for r in cur.fetchall():
        lines.append(f"{r['first_name']};{r['last_name']};{r['email']};{r['month']};{r['amount']};{r['status']};{r['paid_at']}")
    return Response('\n'.join(lines), mimetype='text/csv', headers={'Content-Disposition': 'attachment; filename=cotisations.csv'})


# ─── SUPPORT REQUESTS ───────────────────────────────────────────────────────

@app.route('/api/admin/requests')
@login_required
@role_required('admin')
def api_admin_requests():
    db = get_db()
    cur = db.cursor()
    cur.execute("""
        SELECT sr.*,u.first_name,u.last_name,u.email FROM support_requests sr
        JOIN users u ON u.id=sr.user_id ORDER BY sr.created_at DESC
    """)
    reqs = [dict(r) for r in cur.fetchall()]
    schedules = {}
    for req in reqs:
        if req['type'] == 'pret':
            cur.execute('SELECT * FROM loan_payments WHERE request_id=%s ORDER BY due_date', (req['id'],))
            schedules[req['id']] = [dict(r) for r in cur.fetchall()]
    return jsonify({'requests': reqs, 'schedules': schedules})


@app.route('/api/admin/requests/<int:req_id>', methods=['PATCH'])
@login_required
@role_required('admin')
def api_admin_update_request(req_id):
    data = request.get_json()
    db = get_db()
    cur = db.cursor()
    cur.execute('SELECT * FROM support_requests WHERE id=%s', (req_id,))
    row = cur.fetchone()
    if not row:
        return jsonify({'error': 'Introuvable'}), 404
    cur.execute('UPDATE support_requests SET status=%s,admin_note=%s,updated_at=%s WHERE id=%s', (data['status'], data.get('admin_note',''), current_ts(), req_id))
    if row['type'] == 'pret' and data['status'] == 'approuve':
        create_schedule(row['id'], row['amount'] or 0, row['desired_months'] or 1)
    db.commit()
    log_action('decision_dossier','support_request',req_id,data['status'])
    return jsonify({'ok': True})


@app.route('/api/admin/requests/<int:req_id>/installments/<int:inst_id>/pay', methods=['POST'])
@login_required
@role_required('admin')
def api_mark_installment_paid(req_id, inst_id):
    db = get_db()
    cur = db.cursor()
    cur.execute('UPDATE loan_payments SET status=%s,paid_at=%s WHERE id=%s', ('paye', current_ts(), inst_id))
    db.commit()
    log_action('remboursement_enregistre','loan_payment',inst_id,'Mensualité payée')
    return jsonify({'ok': True})


# ─── EVENTS (admin) ──────────────────────────────────────────────────────────

@app.route('/api/admin/events')
@login_required
@role_required('admin')
def api_admin_events():
    db = get_db()
    cur = db.cursor()
    cur.execute("""
        SELECT ce.*,COUNT(er.id) AS registrations FROM cohesion_events ce
        LEFT JOIN event_registrations er ON er.event_id=ce.id AND er.status='present'
        GROUP BY ce.id ORDER BY ce.event_date DESC
    """)
    events = [dict(r) for r in cur.fetchall()]
    cur.execute("""
        SELECT le.*,u.first_name,u.last_name FROM life_events le
        JOIN users u ON u.id=le.user_id ORDER BY le.created_at DESC
    """)
    life_events = [dict(r) for r in cur.fetchall()]
    cur.execute("""
        SELECT er.*,ce.title,u.first_name,u.last_name FROM event_registrations er
        JOIN cohesion_events ce ON ce.id=er.event_id
        JOIN users u ON u.id=er.user_id ORDER BY ce.event_date DESC,u.last_name
    """)
    registrations = [dict(r) for r in cur.fetchall()]
    return jsonify({'events': events, 'life_events': life_events, 'registrations': registrations})


@app.route('/api/admin/events', methods=['POST'])
@login_required
@role_required('admin')
def api_admin_create_event():
    data = request.get_json()
    db = get_db()
    cur = db.cursor()
    cur.execute(
        "INSERT INTO cohesion_events (title,event_date,location,capacity,description,created_by,created_at) VALUES (%s,%s,%s,%s,%s,%s,%s) RETURNING id",
        (data['title'], data['event_date'], data['location'], int(data['capacity']), data.get('description',''), current_user.id, current_ts()),
    )
    new_id = cur.fetchone()['id']
    db.commit()
    log_action('creation_evenement','cohesion_event',new_id,data['title'])
    return jsonify({'id': new_id}), 201


@app.route('/api/admin/life-events/<int:event_id>', methods=['PATCH'])
@login_required
@role_required('admin')
def api_admin_update_life_event(event_id):
    data = request.get_json()
    db = get_db()
    cur = db.cursor()
    cur.execute('UPDATE life_events SET status=%s WHERE id=%s', (data['status'], event_id))
    db.commit()
    log_action('validation_evenement_vie','life_event',event_id,data['status'])
    return jsonify({'ok': True})


# ─── MEMBER ──────────────────────────────────────────────────────────────────

@app.route('/api/member/dashboard')
@login_required
@role_required('user')
def api_member_dashboard():
    db = get_db()
    cur = db.cursor()
    cur.execute('SELECT * FROM contributions WHERE user_id=%s ORDER BY month DESC', (current_user.id,))
    contributions = [dict(r) for r in cur.fetchall()]
    cur.execute('SELECT * FROM support_requests WHERE user_id=%s ORDER BY created_at DESC', (current_user.id,))
    reqs = [dict(r) for r in cur.fetchall()]
    cur.execute('SELECT * FROM life_events WHERE user_id=%s ORDER BY created_at DESC', (current_user.id,))
    life_events = [dict(r) for r in cur.fetchall()]
    cur.execute("""
        SELECT ce.*,er.status AS registration_status FROM cohesion_events ce
        LEFT JOIN event_registrations er ON er.event_id=ce.id AND er.user_id=%s
        ORDER BY ce.event_date ASC
    """, (current_user.id,))
    events = [dict(r) for r in cur.fetchall()]
    cur.execute("""
        SELECT COALESCE(SUM(lp.amount),0) AS balance FROM loan_payments lp
        JOIN support_requests sr ON sr.id=lp.request_id
        WHERE sr.user_id=%s AND sr.type='pret' AND lp.status='a_payer'
    """, (current_user.id,))
    loan_balance = float(cur.fetchone()['balance'])
    return jsonify({'contributions': contributions, 'requests': reqs, 'life_events': life_events, 'upcoming_events': events, 'loan_balance': loan_balance})


@app.route('/api/member/requests', methods=['POST'])
@login_required
@role_required('user')
def api_member_new_request():
    data = request.get_json()
    db = get_db()
    cur = db.cursor()
    cur.execute(
        "INSERT INTO support_requests (user_id,type,title,amount,reason,desired_months,status,admin_note,document_path,created_at,updated_at) VALUES (%s,%s,%s,%s,%s,%s,'en_attente',NULL,NULL,%s,%s) RETURNING id",
        (current_user.id, data['type'], data['title'], data.get('amount'), data['reason'], data.get('desired_months'), current_ts(), current_ts()),
    )
    new_id = cur.fetchone()['id']
    db.commit()
    log_action('creation_demande','support_request',new_id,data['type'])
    return jsonify({'id': new_id}), 201


@app.route('/api/member/life-events', methods=['POST'])
@login_required
@role_required('user')
def api_member_new_life_event():
    data = request.get_json()
    db = get_db()
    cur = db.cursor()
    cur.execute(
        "INSERT INTO life_events (user_id,event_type,event_date,description,document_path,status,created_at) VALUES (%s,%s,%s,%s,NULL,'en_attente',%s) RETURNING id",
        (current_user.id, data['event_type'], data['event_date'], data.get('description',''), current_ts()),
    )
    new_id = cur.fetchone()['id']
    db.commit()
    log_action('declaration_evenement_vie','life_event',new_id,data['event_type'])
    return jsonify({'id': new_id}), 201


@app.route('/api/member/events/<int:event_id>/register', methods=['POST'])
@login_required
@role_required('user')
def api_member_register_event(event_id):
    data = request.get_json()
    db = get_db()
    cur = db.cursor()
    cur.execute("""
        INSERT INTO event_registrations (event_id,user_id,status,created_at) VALUES (%s,%s,%s,%s)
        ON CONFLICT(event_id,user_id) DO UPDATE SET status=EXCLUDED.status,created_at=EXCLUDED.created_at
    """, (event_id, current_user.id, data['status'], current_ts()))
    db.commit()
    log_action('inscription_evenement','event_registration',event_id,data['status'])
    return jsonify({'ok': True})


@app.route('/api/health')
def health():
    return jsonify({'status': 'ok', 'time': current_ts()})


if __name__ == '__main__':
    if DATABASE_URL:
        init_db()
        seed_db()
    app.run(debug=False, host='0.0.0.0', port=int(os.environ.get('PORT', 5000)))
else:
    if DATABASE_URL:
        try:
            init_db()
            seed_db()
        except Exception as e:
            print(f'DB init skipped: {e}')
