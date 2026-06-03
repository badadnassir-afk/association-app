import os
import secrets
import sqlite3
from datetime import date, datetime
from functools import wraps
from math import floor
from uuid import uuid4
from werkzeug.security import check_password_hash, generate_password_hash
from werkzeug.utils import secure_filename
from flask import (
    Flask,
    abort,
    flash,
    g,
    redirect,
    render_template,
    request,
    send_from_directory,
    session,
    url_for,
    Response,
)
from flask_login import (
    LoginManager,
    UserMixin,
    current_user,
    login_required,
    login_user,
    logout_user,
)

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DB_PATH = os.path.join(BASE_DIR, 'association.db')
UPLOAD_FOLDER = os.path.join(BASE_DIR, 'uploads')
ALLOWED_EXTENSIONS = {'pdf', 'png', 'jpg', 'jpeg'}

app = Flask(__name__)
app.config['SECRET_KEY'] = os.environ.get('SECRET_KEY', 'dev-secret-change-me')
app.config['UPLOAD_FOLDER'] = UPLOAD_FOLDER
app.config['MAX_CONTENT_LENGTH'] = 10 * 1024 * 1024

login_manager = LoginManager()
login_manager.login_view = 'login'
login_manager.init_app(app)

os.makedirs(UPLOAD_FOLDER, exist_ok=True)


class User(UserMixin):
    def __init__(self, row):
        self.id = str(row['id'])
        self.email = row['email']
        self.role = row['role']
        self.first_name = row['first_name']
        self.last_name = row['last_name']
        self.phone = row['phone']
        self.joined_at = row['joined_at']
        self.status = row['status']

    @property
    def full_name(self):
        return f"{self.first_name} {self.last_name}"


def get_db():
    if 'db' not in g:
        g.db = sqlite3.connect(DB_PATH)
        g.db.row_factory = sqlite3.Row
    return g.db


@app.teardown_appcontext
def close_db(exception=None):
    db = g.pop('db', None)
    if db is not None:
        db.close()


def init_db():
    db = sqlite3.connect(DB_PATH)
    cursor = db.cursor()
    cursor.executescript(
        """
        PRAGMA foreign_keys = ON;

        CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
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
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL,
            month TEXT NOT NULL,
            amount REAL NOT NULL,
            status TEXT NOT NULL CHECK(status IN ('payee', 'partielle', 'impayee')),
            paid_at TEXT,
            UNIQUE(user_id, month),
            FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
        );

        CREATE TABLE IF NOT EXISTS support_requests (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
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
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            request_id INTEGER NOT NULL,
            due_date TEXT NOT NULL,
            amount REAL NOT NULL,
            status TEXT NOT NULL DEFAULT 'a_payer' CHECK(status IN ('a_payer', 'paye')),
            paid_at TEXT,
            FOREIGN KEY(request_id) REFERENCES support_requests(id) ON DELETE CASCADE
        );

        CREATE TABLE IF NOT EXISTS life_events (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
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
            id INTEGER PRIMARY KEY AUTOINCREMENT,
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
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            event_id INTEGER NOT NULL,
            user_id INTEGER NOT NULL,
            status TEXT NOT NULL CHECK(status IN ('present', 'absent', 'attente')),
            created_at TEXT NOT NULL,
            UNIQUE(event_id, user_id),
            FOREIGN KEY(event_id) REFERENCES cohesion_events(id) ON DELETE CASCADE,
            FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
        );

        CREATE TABLE IF NOT EXISTS audit_logs (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER,
            action TEXT NOT NULL,
            entity_type TEXT NOT NULL,
            entity_id TEXT,
            details TEXT,
            created_at TEXT NOT NULL,
            FOREIGN KEY(user_id) REFERENCES users(id)
        );
        """
    )
    db.commit()
    db.close()


def seed_db():
    db = sqlite3.connect(DB_PATH)
    db.row_factory = sqlite3.Row
    cursor = db.cursor()
    existing = cursor.execute("SELECT COUNT(*) AS c FROM users").fetchone()['c']
    if existing:
        db.close()
        return

    cursor.execute(
        """
        INSERT INTO users (email, password_hash, role, first_name, last_name, phone, joined_at, status)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        """,
        (
            'admin@association.local',
            generate_password_hash('Admin123!'),
            'admin',
            'Awa',
            'Diop',
            '+221700000001',
            '2025-01-15',
            'actif',
        ),
    )
    admin_id = cursor.lastrowid
    cursor.execute(
        """
        INSERT INTO users (email, password_hash, role, first_name, last_name, phone, joined_at, status)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        """,
        (
            'membre@association.local',
            generate_password_hash('Member123!'),
            'user',
            'Fatou',
            'Ndiaye',
            '+221700000002',
            '2025-03-01',
            'actif',
        ),
    )
    member_id = cursor.lastrowid

    sample_contributions = [
        (member_id, '2026-03', 10.0, 'payee', '2026-03-05'),
        (member_id, '2026-04', 10.0, 'payee', '2026-04-06'),
        (member_id, '2026-05', 10.0, 'partielle', '2026-05-20'),
    ]
    cursor.executemany(
        "INSERT INTO contributions (user_id, month, amount, status, paid_at) VALUES (?, ?, ?, ?, ?)",
        sample_contributions,
    )

    now = datetime.utcnow().strftime('%Y-%m-%d %H:%M:%S')
    cursor.execute(
        """
        INSERT INTO support_requests (user_id, type, title, amount, reason, desired_months, status, admin_note, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """,
        (
            member_id,
            'pret',
            'Aide ponctuelle santé',
            300.0,
            'Besoin d’un prêt d’honneur pour une dépense médicale urgente.',
            3,
            'en_attente',
            None,
            now,
            now,
        ),
    )

    cursor.execute(
        """
        INSERT INTO life_events (user_id, event_type, event_date, description, status, created_at)
        VALUES (?, ?, ?, ?, ?, ?)
        """,
        (member_id, 'naissance', '2026-05-15', 'Déclaration de naissance avec justificatif à fournir.', 'en_attente', now),
    )

    cursor.execute(
        """
        INSERT INTO cohesion_events (title, event_date, location, capacity, description, created_by, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?)
        """,
        ('Teambuilding trimestriel', '2026-06-20', 'Salle polyvalente', 40, 'Journée de cohésion et activités collectives.', admin_id, now),
    )
    event_id = cursor.lastrowid
    cursor.execute(
        "INSERT INTO event_registrations (event_id, user_id, status, created_at) VALUES (?, ?, ?, ?)",
        (event_id, member_id, 'present', now),
    )

    db.commit()
    db.close()


@login_manager.user_loader
def load_user(user_id):
    row = get_db().execute('SELECT * FROM users WHERE id = ?', (user_id,)).fetchone()
    return User(row) if row else None


def allowed_file(filename):
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS


def current_ts():
    return datetime.utcnow().strftime('%Y-%m-%d %H:%M:%S')


def month_label():
    return date.today().strftime('%Y-%m')


def add_months(start_date, months_to_add):
    year = start_date.year + (start_date.month - 1 + months_to_add) // 12
    month = (start_date.month - 1 + months_to_add) % 12 + 1
    day = min(start_date.day, [31, 29 if year % 4 == 0 and (year % 100 != 0 or year % 400 == 0) else 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31][month - 1])
    return date(year, month, day)


def create_schedule(request_id, total_amount, months):
    if not months or months <= 0:
        months = 1
    db = get_db()
    existing = db.execute('SELECT COUNT(*) AS c FROM loan_payments WHERE request_id = ?', (request_id,)).fetchone()['c']
    if existing:
        return
    monthly = round(float(total_amount) / months, 2)
    amounts = [monthly] * months
    amounts[-1] = round(float(total_amount) - round(monthly * (months - 1), 2), 2)
    start = date.today().replace(day=5)
    for idx, amount in enumerate(amounts, start=1):
        due = add_months(start, idx)
        db.execute(
            'INSERT INTO loan_payments (request_id, due_date, amount, status) VALUES (?, ?, ?, ?)',
            (request_id, due.isoformat(), amount, 'a_payer'),
        )


def log_action(action, entity_type, entity_id=None, details=None):
    db = get_db()
    db.execute(
        'INSERT INTO audit_logs (user_id, action, entity_type, entity_id, details, created_at) VALUES (?, ?, ?, ?, ?, ?)',
        (
            int(current_user.id) if current_user.is_authenticated else None,
            action,
            entity_type,
            str(entity_id) if entity_id else None,
            details,
            current_ts(),
        ),
    )
    db.commit()


def role_required(*roles):
    def decorator(fn):
        @wraps(fn)
        def wrapper(*args, **kwargs):
            if not current_user.is_authenticated:
                return login_manager.unauthorized()
            if current_user.role not in roles:
                abort(403)
            return fn(*args, **kwargs)
        return wrapper
    return decorator


@app.before_request
def ensure_csrf():
    if 'csrf_token' not in session:
        session['csrf_token'] = secrets.token_hex(16)
    if request.method == 'POST':
        token = request.form.get('csrf_token')
        if token != session.get('csrf_token'):
            abort(400, description='Jeton CSRF invalide.')


@app.context_processor
def inject_helpers():
    return {
        'csrf_token': session.get('csrf_token', ''),
        'app_name': 'Association d’entraide',
    }


@app.template_filter('money')
def money_filter(value):
    if value is None:
        return '0,00 €'
    return f"{float(value):,.2f} €".replace(',', 'X').replace('.', ',').replace('X', ' ')


@app.template_filter('dt')
def dt_filter(value):
    if not value:
        return '—'
    try:
        if len(value) == 10:
            return datetime.strptime(value, '%Y-%m-%d').strftime('%d/%m/%Y')
        return datetime.strptime(value, '%Y-%m-%d %H:%M:%S').strftime('%d/%m/%Y %H:%M')
    except Exception:
        return value


@app.route('/')
def index():
    if current_user.is_authenticated:
        return redirect(url_for('admin_dashboard' if current_user.role == 'admin' else 'member_dashboard'))
    return redirect(url_for('login'))


@app.route('/login', methods=['GET', 'POST'])
def login():
    if current_user.is_authenticated:
        return redirect(url_for('index'))
    if request.method == 'POST':
        email = request.form.get('email', '').strip().lower()
        password = request.form.get('password', '')
        user_row = get_db().execute('SELECT * FROM users WHERE email = ?', (email,)).fetchone()
        if user_row and check_password_hash(user_row['password_hash'], password):
            user = User(user_row)
            login_user(user)
            log_action('connexion', 'auth', user.id, 'Connexion réussie')
            flash('Connexion réussie.', 'success')
            return redirect(url_for('index'))
        flash('Identifiants invalides.', 'error')
    return render_template('login.html')


@app.route('/logout', methods=['POST'])
@login_required
def logout():
    log_action('deconnexion', 'auth', current_user.id, 'Déconnexion utilisateur')
    logout_user()
    flash('Vous êtes déconnecté.', 'success')
    return redirect(url_for('login'))


@app.route('/profile')
@login_required
def profile():
    db = get_db()
    contributions = db.execute(
        'SELECT * FROM contributions WHERE user_id = ? ORDER BY month DESC', (current_user.id,)
    ).fetchall()
    requests_data = db.execute(
        'SELECT * FROM support_requests WHERE user_id = ? ORDER BY created_at DESC', (current_user.id,)
    ).fetchall()
    life_events = db.execute(
        'SELECT * FROM life_events WHERE user_id = ? ORDER BY created_at DESC', (current_user.id,)
    ).fetchall()
    return render_template(
        'profile.html',
        contributions=contributions,
        requests_data=requests_data,
        life_events=life_events,
    )


@app.route('/admin/dashboard')
@login_required
@role_required('admin')
def admin_dashboard():
    db = get_db()
    stats = {
        'members': db.execute("SELECT COUNT(*) AS c FROM users WHERE role = 'user'").fetchone()['c'],
        'contributions_total': db.execute("SELECT COALESCE(SUM(amount), 0) AS s FROM contributions WHERE status IN ('payee', 'partielle')").fetchone()['s'],
        'active_loans': db.execute("SELECT COALESCE(SUM(amount), 0) AS s FROM support_requests WHERE type = 'pret' AND status = 'approuve'").fetchone()['s'],
        'pending_cases': db.execute("SELECT COUNT(*) AS c FROM support_requests WHERE status IN ('en_attente', 'precisions')").fetchone()['c'],
        'pending_life_events': db.execute("SELECT COUNT(*) AS c FROM life_events WHERE status = 'en_attente'").fetchone()['c'],
    }
    current_month = month_label()
    overdue = db.execute(
        """
        SELECT u.id, u.first_name, u.last_name, u.email
        FROM users u
        WHERE u.role = 'user'
          AND u.status = 'actif'
          AND NOT EXISTS (
              SELECT 1 FROM contributions c
              WHERE c.user_id = u.id
                AND c.month = ?
                AND c.status IN ('payee', 'partielle')
          )
        ORDER BY u.last_name, u.first_name
        """,
        (current_month,),
    ).fetchall()
    recent_requests = db.execute(
        """
        SELECT sr.*, u.first_name, u.last_name
        FROM support_requests sr
        JOIN users u ON u.id = sr.user_id
        ORDER BY sr.created_at DESC
        LIMIT 5
        """
    ).fetchall()
    recent_life_events = db.execute(
        """
        SELECT le.*, u.first_name, u.last_name
        FROM life_events le
        JOIN users u ON u.id = le.user_id
        ORDER BY le.created_at DESC
        LIMIT 5
        """
    ).fetchall()
    return render_template(
        'admin_dashboard.html',
        stats=stats,
        overdue=overdue,
        current_month=current_month,
        recent_requests=recent_requests,
        recent_life_events=recent_life_events,
    )


@app.route('/admin/members')
@login_required
@role_required('admin')
def admin_members():
    members = get_db().execute(
        "SELECT * FROM users WHERE role = 'user' ORDER BY last_name, first_name"
    ).fetchall()
    return render_template('admin_members.html', members=members)


@app.route('/admin/contributions', methods=['GET', 'POST'])
@login_required
@role_required('admin')
def admin_contributions():
    db = get_db()
    if request.method == 'POST':
        user_id = request.form.get('user_id')
        month = request.form.get('month')
        amount = float(request.form.get('amount') or 0)
        status = request.form.get('status')
        paid_at = request.form.get('paid_at') or None
        db.execute(
            """
            INSERT INTO contributions (user_id, month, amount, status, paid_at)
            VALUES (?, ?, ?, ?, ?)
            ON CONFLICT(user_id, month)
            DO UPDATE SET amount = excluded.amount, status = excluded.status, paid_at = excluded.paid_at
            """,
            (user_id, month, amount, status, paid_at),
        )
        db.commit()
        log_action('mise_a_jour_cotisation', 'contribution', f'{user_id}-{month}', f'{status} {amount}')
        flash('Cotisation enregistrée.', 'success')
        return redirect(url_for('admin_contributions'))

    members = db.execute("SELECT id, first_name, last_name FROM users WHERE role = 'user' ORDER BY last_name").fetchall()
    contributions = db.execute(
        """
        SELECT c.*, u.first_name, u.last_name
        FROM contributions c
        JOIN users u ON u.id = c.user_id
        ORDER BY c.month DESC, u.last_name, u.first_name
        """
    ).fetchall()
    return render_template('admin_contributions.html', members=members, contributions=contributions, current_month=month_label())


@app.route('/admin/contributions/export')
@login_required
@role_required('admin')
def export_contributions():
    rows = get_db().execute(
        """
        SELECT u.first_name, u.last_name, u.email, c.month, c.amount, c.status, COALESCE(c.paid_at, '') AS paid_at
        FROM contributions c
        JOIN users u ON u.id = c.user_id
        ORDER BY c.month DESC, u.last_name, u.first_name
        """
    ).fetchall()
    lines = ['prenom;nom;email;mois;montant;statut;date_paiement']
    for row in rows:
        lines.append(f"{row['first_name']};{row['last_name']};{row['email']};{row['month']};{row['amount']};{row['status']};{row['paid_at']}")
    csv_content = '\n'.join(lines)
    return Response(
        csv_content,
        mimetype='text/csv',
        headers={'Content-Disposition': 'attachment; filename=cotisations.csv'},
    )


@app.route('/admin/requests', methods=['GET', 'POST'])
@login_required
@role_required('admin')
def admin_requests():
    db = get_db()
    if request.method == 'POST':
        action = request.form.get('action')
        if action == 'update_request':
            request_id = request.form.get('request_id')
            status = request.form.get('status')
            admin_note = request.form.get('admin_note', '').strip()
            row = db.execute('SELECT * FROM support_requests WHERE id = ?', (request_id,)).fetchone()
            if not row:
                abort(404)
            db.execute(
                'UPDATE support_requests SET status = ?, admin_note = ?, updated_at = ? WHERE id = ?',
                (status, admin_note, current_ts(), request_id),
            )
            if row['type'] == 'pret' and status == 'approuve':
                create_schedule(row['id'], row['amount'] or 0, row['desired_months'] or 1)
            db.commit()
            log_action('decision_dossier', 'support_request', request_id, f"{status} | {admin_note}")
            flash('Décision enregistrée.', 'success')
        elif action == 'mark_installment_paid':
            installment_id = request.form.get('installment_id')
            db.execute(
                'UPDATE loan_payments SET status = ?, paid_at = ? WHERE id = ?',
                ('paye', current_ts(), installment_id),
            )
            db.commit()
            log_action('remboursement_enregistre', 'loan_payment', installment_id, 'Mensualité payée')
            flash('Mensualité marquée comme payée.', 'success')
        return redirect(url_for('admin_requests'))

    requests_data = db.execute(
        """
        SELECT sr.*, u.first_name, u.last_name, u.email
        FROM support_requests sr
        JOIN users u ON u.id = sr.user_id
        ORDER BY sr.created_at DESC
        """
    ).fetchall()

    schedules = {}
    for req in requests_data:
        if req['type'] == 'pret':
            schedules[req['id']] = db.execute(
                'SELECT * FROM loan_payments WHERE request_id = ? ORDER BY due_date', (req['id'],)
            ).fetchall()
    return render_template('admin_requests.html', requests_data=requests_data, schedules=schedules)


@app.route('/admin/events', methods=['GET', 'POST'])
@login_required
@role_required('admin')
def admin_events():
    db = get_db()
    if request.method == 'POST':
        action = request.form.get('action')
        if action == 'create_event':
            db.execute(
                """
                INSERT INTO cohesion_events (title, event_date, location, capacity, description, created_by, created_at)
                VALUES (?, ?, ?, ?, ?, ?, ?)
                """,
                (
                    request.form.get('title'),
                    request.form.get('event_date'),
                    request.form.get('location'),
                    int(request.form.get('capacity') or 0),
                    request.form.get('description'),
                    current_user.id,
                    current_ts(),
                ),
            )
            db.commit()
            log_action('creation_evenement', 'cohesion_event', None, request.form.get('title'))
            flash('Événement créé.', 'success')
        elif action == 'update_life_event':
            event_id = request.form.get('life_event_id')
            status = request.form.get('status')
            db.execute('UPDATE life_events SET status = ? WHERE id = ?', (status, event_id))
            db.commit()
            log_action('validation_evenement_vie', 'life_event', event_id, status)
            flash('Décision enregistrée.', 'success')
        return redirect(url_for('admin_events'))

    events = db.execute(
        """
        SELECT ce.*, COUNT(er.id) AS registrations
        FROM cohesion_events ce
        LEFT JOIN event_registrations er ON er.event_id = ce.id AND er.status = 'present'
        GROUP BY ce.id
        ORDER BY ce.event_date DESC
        """
    ).fetchall()
    life_events = db.execute(
        """
        SELECT le.*, u.first_name, u.last_name
        FROM life_events le
        JOIN users u ON u.id = le.user_id
        ORDER BY le.created_at DESC
        """
    ).fetchall()
    registrations = db.execute(
        """
        SELECT er.*, ce.title, u.first_name, u.last_name
        FROM event_registrations er
        JOIN cohesion_events ce ON ce.id = er.event_id
        JOIN users u ON u.id = er.user_id
        ORDER BY ce.event_date DESC, u.last_name
        """
    ).fetchall()
    return render_template('admin_events.html', events=events, life_events=life_events, registrations=registrations)


@app.route('/member/dashboard')
@login_required
@role_required('user')
def member_dashboard():
    db = get_db()
    contributions = db.execute(
        'SELECT * FROM contributions WHERE user_id = ? ORDER BY month DESC', (current_user.id,)
    ).fetchall()
    requests_data = db.execute(
        'SELECT * FROM support_requests WHERE user_id = ? ORDER BY created_at DESC', (current_user.id,)
    ).fetchall()
    life_events = db.execute(
        'SELECT * FROM life_events WHERE user_id = ? ORDER BY created_at DESC', (current_user.id,)
    ).fetchall()
    upcoming_events = db.execute(
        """
        SELECT ce.*, er.status AS registration_status
        FROM cohesion_events ce
        LEFT JOIN event_registrations er ON er.event_id = ce.id AND er.user_id = ?
        ORDER BY ce.event_date ASC
        """,
        (current_user.id,),
    ).fetchall()
    loan_balance = db.execute(
        """
        SELECT COALESCE(SUM(lp.amount), 0) AS balance
        FROM loan_payments lp
        JOIN support_requests sr ON sr.id = lp.request_id
        WHERE sr.user_id = ? AND sr.type = 'pret' AND lp.status = 'a_payer'
        """,
        (current_user.id,),
    ).fetchone()['balance']
    return render_template(
        'member_dashboard.html',
        contributions=contributions,
        requests_data=requests_data,
        life_events=life_events,
        upcoming_events=upcoming_events,
        loan_balance=loan_balance,
    )


@app.route('/member/requests/new', methods=['GET', 'POST'])
@login_required
@role_required('user')
def member_new_request():
    if request.method == 'POST':
        request_type = request.form.get('type')
        title = request.form.get('title', '').strip()
        amount_raw = request.form.get('amount', '').strip()
        amount = float(amount_raw) if amount_raw else None
        reason = request.form.get('reason', '').strip()
        desired_months = request.form.get('desired_months') or None
        desired_months = int(desired_months) if desired_months else None
        document_path = None

        file = request.files.get('document')
        if file and file.filename:
            if not allowed_file(file.filename):
                flash('Format de justificatif non autorisé.', 'error')
                return redirect(url_for('member_new_request'))
            filename = f"{uuid4().hex}_{secure_filename(file.filename)}"
            save_path = os.path.join(app.config['UPLOAD_FOLDER'], filename)
            file.save(save_path)
            document_path = filename

        get_db().execute(
            """
            INSERT INTO support_requests (user_id, type, title, amount, reason, desired_months, status, admin_note, document_path, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, 'en_attente', NULL, ?, ?, ?)
            """,
            (current_user.id, request_type, title, amount, reason, desired_months, document_path, current_ts(), current_ts()),
        )
        get_db().commit()
        log_action('creation_demande', 'support_request', None, request_type)
        flash('Votre demande a bien été transmise.', 'success')
        return redirect(url_for('member_dashboard'))
    return render_template('member_request_form.html')


@app.route('/member/life-events/new', methods=['GET', 'POST'])
@login_required
@role_required('user')
def member_new_life_event():
    if request.method == 'POST':
        event_type = request.form.get('event_type')
        event_date = request.form.get('event_date')
        description = request.form.get('description', '').strip()
        document_path = None

        file = request.files.get('document')
        if file and file.filename:
            if not allowed_file(file.filename):
                flash('Format de justificatif non autorisé.', 'error')
                return redirect(url_for('member_new_life_event'))
            filename = f"{uuid4().hex}_{secure_filename(file.filename)}"
            file.save(os.path.join(app.config['UPLOAD_FOLDER'], filename))
            document_path = filename

        get_db().execute(
            """
            INSERT INTO life_events (user_id, event_type, event_date, description, document_path, status, created_at)
            VALUES (?, ?, ?, ?, ?, 'en_attente', ?)
            """,
            (current_user.id, event_type, event_date, description, document_path, current_ts()),
        )
        get_db().commit()
        log_action('declaration_evenement_vie', 'life_event', None, event_type)
        flash('Votre déclaration a été enregistrée.', 'success')
        return redirect(url_for('member_dashboard'))
    return render_template('member_life_event_form.html')


@app.route('/member/events', methods=['GET', 'POST'])
@login_required
@role_required('user')
def member_events():
    db = get_db()
    if request.method == 'POST':
        event_id = request.form.get('event_id')
        status = request.form.get('status')
        db.execute(
            """
            INSERT INTO event_registrations (event_id, user_id, status, created_at)
            VALUES (?, ?, ?, ?)
            ON CONFLICT(event_id, user_id)
            DO UPDATE SET status = excluded.status, created_at = excluded.created_at
            """,
            (event_id, current_user.id, status, current_ts()),
        )
        db.commit()
        log_action('inscription_evenement', 'event_registration', event_id, status)
        flash('Votre réponse a été enregistrée.', 'success')
        return redirect(url_for('member_events'))

    events = db.execute(
        """
        SELECT ce.*, er.status AS registration_status
        FROM cohesion_events ce
        LEFT JOIN event_registrations er ON er.event_id = ce.id AND er.user_id = ?
        ORDER BY ce.event_date ASC
        """,
        (current_user.id,),
    ).fetchall()
    return render_template('member_events.html', events=events)


@app.route('/documents/<filename>')
@login_required
def download_document(filename):
    db = get_db()
    support = db.execute(
        'SELECT user_id, document_path FROM support_requests WHERE document_path = ?', (filename,)
    ).fetchone()
    life_event = db.execute(
        'SELECT user_id, document_path FROM life_events WHERE document_path = ?', (filename,)
    ).fetchone()
    owner_id = None
    if support:
        owner_id = support['user_id']
    elif life_event:
        owner_id = life_event['user_id']
    else:
        abort(404)

    if current_user.role != 'admin' and str(owner_id) != current_user.id:
        abort(403)

    log_action('consultation_justificatif', 'document', filename, 'Téléchargement justificatif')
    return send_from_directory(app.config['UPLOAD_FOLDER'], filename, as_attachment=True)


@app.errorhandler(403)
def forbidden(error):
    return render_template('error.html', title='Accès refusé', message='Vous n’êtes pas autorisé à accéder à cette ressource.'), 403


@app.errorhandler(404)
def missing(error):
    return render_template('error.html', title='Introuvable', message='La ressource demandée est introuvable.'), 404


@app.errorhandler(400)
def bad_request(error):
    return render_template('error.html', title='Requête invalide', message=str(error.description) if hasattr(error, 'description') else 'La requête est invalide.'), 400


if __name__ == '__main__':
    init_db()
    seed_db()
    app.run(debug=True, host='0.0.0.0', port=5000)
else:
    init_db()
    seed_db()
