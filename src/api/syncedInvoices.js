import { request } from './client';

function buildQuery({ search, page, limit } = {}) {
  const params = new URLSearchParams();
  if (search) params.set('search', search);
  if (page) params.set('page', page);
  if (limit) params.set('limit', limit);
  const qs = params.toString();
  return qs ? `?${qs}` : '';
}

export function listInvoices(shopId, opts) {
  return request(`/api/admin/shops/${shopId}/invoices${buildQuery(opts)}`);
}

export function getInvoice(shopId, id) {
  return request(`/api/admin/shops/${shopId}/invoices/${id}`);
}

export function createInvoice(shopId, data) {
  return request(`/api/admin/shops/${shopId}/invoices`, { method: 'POST', body: data });
}

export function updateInvoice(shopId, id, data) {
  return request(`/api/admin/shops/${shopId}/invoices/${id}`, { method: 'PATCH', body: data });
}

export function deleteInvoice(shopId, id) {
  return request(`/api/admin/shops/${shopId}/invoices/${id}`, { method: 'DELETE' });
}
