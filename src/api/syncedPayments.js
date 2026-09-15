import { request } from './client';

function buildQuery({ search, page, limit } = {}) {
  const params = new URLSearchParams();
  if (search) params.set('search', search);
  if (page) params.set('page', page);
  if (limit) params.set('limit', limit);
  const qs = params.toString();
  return qs ? `?${qs}` : '';
}

export function listPayments(shopId, opts) {
  return request(`/api/admin/shops/${shopId}/payments${buildQuery(opts)}`);
}

export function createPayment(shopId, data) {
  return request(`/api/admin/shops/${shopId}/payments`, { method: 'POST', body: data });
}

export function updatePayment(shopId, id, data) {
  return request(`/api/admin/shops/${shopId}/payments/${id}`, { method: 'PATCH', body: data });
}

export function deletePayment(shopId, id) {
  return request(`/api/admin/shops/${shopId}/payments/${id}`, { method: 'DELETE' });
}
