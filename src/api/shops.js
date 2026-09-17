import { request } from './client';

export function listShops({ page, limit, status, search } = {}) {
  const params = new URLSearchParams();
  if (page) params.set('page', page);
  if (limit) params.set('limit', limit);
  if (status) params.set('status', status);
  if (search) params.set('search', search);
  const qs = params.toString();
  return request(`/api/admin/shops${qs ? `?${qs}` : ''}`);
}

export function getShop(id) {
  return request(`/api/admin/shops/${id}`);
}

export function createShop(data) {
  return request('/api/admin/shops', { method: 'POST', body: data });
}

export function updateShop(id, data) {
  return request(`/api/admin/shops/${id}`, { method: 'PATCH', body: data });
}

export function setShopStatus(id, status) {
  return request(`/api/admin/shops/${id}/status`, { method: 'PATCH', body: { status } });
}

export function setModuleOverride(shopId, moduleId, enabled) {
  return request(`/api/admin/shops/${shopId}/modules/${moduleId}`, {
    method: 'PATCH',
    body: { enabled },
  });
}

export function removeModuleOverride(shopId, moduleId) {
  return request(`/api/admin/shops/${shopId}/modules/${moduleId}`, { method: 'DELETE' });
}

export function uploadShopLogo(shopId, file) {
  const formData = new FormData();
  formData.append('image', file);
  return request(`/api/admin/shops/${shopId}/logo`, { method: 'POST', body: formData });
}

export function deleteShopLogo(shopId) {
  return request(`/api/admin/shops/${shopId}/logo`, { method: 'DELETE' });
}
