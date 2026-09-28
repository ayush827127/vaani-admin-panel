import { request } from './client';

export function listAuditLog(shopId, { page, limit } = {}) {
  const params = new URLSearchParams();
  if (page) params.set('page', page);
  if (limit) params.set('limit', limit);
  const qs = params.toString();
  return request(`/api/admin/shops/${shopId}/audit-log${qs ? `?${qs}` : ''}`);
}
