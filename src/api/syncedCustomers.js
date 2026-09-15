import { request } from './client';

function buildQuery({ search, page, limit } = {}) {
  const params = new URLSearchParams();
  if (search) params.set('search', search);
  if (page) params.set('page', page);
  if (limit) params.set('limit', limit);
  const qs = params.toString();
  return qs ? `?${qs}` : '';
}

export function listCustomers(shopId, opts) {
  return request(`/api/admin/shops/${shopId}/customers${buildQuery(opts)}`);
}

export function createCustomer(shopId, data) {
  return request(`/api/admin/shops/${shopId}/customers`, { method: 'POST', body: data });
}

export function updateCustomer(shopId, id, data) {
  return request(`/api/admin/shops/${shopId}/customers/${id}`, { method: 'PATCH', body: data });
}

export function deleteCustomer(shopId, id) {
  return request(`/api/admin/shops/${shopId}/customers/${id}`, { method: 'DELETE' });
}
