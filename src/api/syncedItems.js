import { request } from './client';

function buildQuery({ search, page, limit } = {}) {
  const params = new URLSearchParams();
  if (search) params.set('search', search);
  if (page) params.set('page', page);
  if (limit) params.set('limit', limit);
  const qs = params.toString();
  return qs ? `?${qs}` : '';
}

export function listItems(shopId, opts) {
  return request(`/api/admin/shops/${shopId}/items${buildQuery(opts)}`);
}

export function createItem(shopId, data) {
  return request(`/api/admin/shops/${shopId}/items`, { method: 'POST', body: data });
}

export function updateItem(shopId, id, data) {
  return request(`/api/admin/shops/${shopId}/items/${id}`, { method: 'PATCH', body: data });
}

export function deleteItem(shopId, id) {
  return request(`/api/admin/shops/${shopId}/items/${id}`, { method: 'DELETE' });
}

export function uploadItemImage(shopId, id, file) {
  const formData = new FormData();
  formData.append('image', file);
  return request(`/api/admin/shops/${shopId}/items/${id}/image`, {
    method: 'POST',
    body: formData,
  });
}

export function deleteItemImage(shopId, id) {
  return request(`/api/admin/shops/${shopId}/items/${id}/image`, { method: 'DELETE' });
}
