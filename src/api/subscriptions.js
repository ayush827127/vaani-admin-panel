import { request } from './client';

export function listSubscriptionsForShop(shopId) {
  return request(`/api/admin/shops/${shopId}/subscriptions`);
}

export function createSubscription(data) {
  return request('/api/admin/subscriptions', { method: 'POST', body: data });
}

export function updateSubscription(id, data) {
  return request(`/api/admin/subscriptions/${id}`, { method: 'PATCH', body: data });
}
