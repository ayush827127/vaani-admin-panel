import { request } from './client';

export function listPlans() {
  return request('/api/admin/plans');
}

export function getPlan(id) {
  return request(`/api/admin/plans/${id}`);
}

export function createPlan(data) {
  return request('/api/admin/plans', { method: 'POST', body: data });
}

export function updatePlan(id, data) {
  return request(`/api/admin/plans/${id}`, { method: 'PATCH', body: data });
}

export function deletePlan(id) {
  return request(`/api/admin/plans/${id}`, { method: 'DELETE' });
}
