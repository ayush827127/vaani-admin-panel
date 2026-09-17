import { request } from './client';

export function listModules() {
  return request('/api/admin/modules');
}

export function createModule(data) {
  return request('/api/admin/modules', { method: 'POST', body: data });
}

export function updateModule(id, data) {
  return request(`/api/admin/modules/${id}`, { method: 'PATCH', body: data });
}
