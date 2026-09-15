const BASE_URL = import.meta.env.VITE_API_BASE_URL;
const TOKEN_KEY = 'admin_token';

export function getToken() {
  return localStorage.getItem(TOKEN_KEY);
}

export function setToken(token) {
  localStorage.setItem(TOKEN_KEY, token);
}

export function clearToken() {
  localStorage.removeItem(TOKEN_KEY);
}

export async function request(path, { method = 'GET', body } = {}) {
  const isFormData = body instanceof FormData;
  const headers = {};
  if (!isFormData) headers['Content-Type'] = 'application/json';
  const token = getToken();
  if (token) headers.Authorization = `Bearer ${token}`;

  const response = await fetch(`${BASE_URL}${path}`, {
    method,
    headers,
    // FormData sets its own multipart Content-Type (with boundary) — must
    // not be JSON.stringify'd or given an explicit Content-Type above.
    body: body === undefined ? undefined : isFormData ? body : JSON.stringify(body),
  });

  if (response.status === 401) {
    clearToken();
    window.location.href = '/login';
    throw new Error('Session expired — please log in again.');
  }

  const envelope = await response.json().catch(() => null);

  if (!response.ok || !envelope?.success) {
    const message = envelope?.error?.message || `Request failed: HTTP ${response.status}`;
    throw new Error(message);
  }

  return envelope.data;
}
