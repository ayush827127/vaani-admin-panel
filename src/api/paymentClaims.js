import { request } from './client';

export function listPaymentClaims({ status, page = 1, limit = 20 } = {}) {
  const params = new URLSearchParams({ page, limit });
  if (status) params.set('status', status);
  return request(`/api/admin/payment-claims?${params.toString()}`);
}

export function confirmPaymentClaim(id) {
  return request(`/api/admin/payment-claims/${id}/confirm`, { method: 'POST' });
}

export function rejectPaymentClaim(id, note) {
  return request(`/api/admin/payment-claims/${id}/reject`, { method: 'POST', body: { note } });
}
