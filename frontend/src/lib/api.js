const BASE = process.env.REACT_APP_API_URL || 'http://localhost:5000';

async function req(method, path, body) {
  const opts = {
    method,
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
  };
  if (body) opts.body = JSON.stringify(body);
  const res = await fetch(`${BASE}${path}`, opts);
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
  return data;
}

export const api = {
  get: (path) => req('GET', path),
  post: (path, body) => req('POST', path, body),
  patch: (path, body) => req('PATCH', path, body),

  // Auth
  login: (email, password) => req('POST', '/api/auth/login', { email, password }),
  logout: () => req('POST', '/api/auth/logout'),
  me: () => req('GET', '/api/auth/me'),

  // Admin
  adminDashboard: () => req('GET', '/api/admin/dashboard'),
  adminMembers: () => req('GET', '/api/admin/members'),
  adminCreateMember: (data) => req('POST', '/api/admin/members', data),
  adminContributions: () => req('GET', '/api/admin/contributions'),
  adminSaveContribution: (data) => req('POST', '/api/admin/contributions', data),
  adminRequests: () => req('GET', '/api/admin/requests'),
  adminUpdateRequest: (id, data) => req('PATCH', `/api/admin/requests/${id}`, data),
  adminMarkInstallmentPaid: (reqId, instId) => req('POST', `/api/admin/requests/${reqId}/installments/${instId}/pay`),
  adminEvents: () => req('GET', '/api/admin/events'),
  adminCreateEvent: (data) => req('POST', '/api/admin/events', data),
  adminUpdateLifeEvent: (id, data) => req('PATCH', `/api/admin/life-events/${id}`, data),
  exportContributions: () => `${BASE}/api/admin/contributions/export`,

  // Member
  memberDashboard: () => req('GET', '/api/member/dashboard'),
  memberNewRequest: (data) => req('POST', '/api/member/requests', data),
  memberNewLifeEvent: (data) => req('POST', '/api/member/life-events', data),
  memberRegisterEvent: (eventId, status) => req('POST', `/api/member/events/${eventId}/register`, { status }),
};
