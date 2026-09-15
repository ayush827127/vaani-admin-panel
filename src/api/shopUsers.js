import { request } from './client';

export function listShopUsers(shopId) {
  return request(`/api/admin/shops/${shopId}/users`);
}

export function createShopUser(shopId, data) {
  return request(`/api/admin/shops/${shopId}/users`, { method: 'POST', body: data });
}

export function updateShopUser(shopId, id, data) {
  return request(`/api/admin/shops/${shopId}/users/${id}`, { method: 'PATCH', body: data });
}

export function setShopUserAccess(shopId, id, moduleId, { canView, canEdit }) {
  return request(`/api/admin/shops/${shopId}/users/${id}/access`, {
    method: 'PATCH',
    body: { moduleId, canView, canEdit },
  });
}
