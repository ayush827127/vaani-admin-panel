import { request } from './client';

export function login(email, password) {
  return request('/api/admin/auth/login', { method: 'POST', body: { email, password } });
}

export function me() {
  return request('/api/admin/auth/me');
}
