import { request } from './client';

// The new User/ShopUser/Invitation membership system — distinct from
// api/shopUsers.js, which is the older admin-only ShopUser CRUD that
// predates it (see the backend's "Admin: Shop Members" vs "Admin: Shop
// Users" tag descriptions in /api-docs for the full distinction).

export function listMembers(shopId) {
  return request(`/api/admin/shops/${shopId}/members`);
}

export function inviteMember(shopId, data) {
  return request(`/api/admin/shops/${shopId}/members/invite`, { method: 'POST', body: data });
}

export function changeMemberRole(shopId, shopUserId, role) {
  return request(`/api/admin/shops/${shopId}/members/${shopUserId}/role`, {
    method: 'PATCH',
    body: { role },
  });
}

export function removeMember(shopId, shopUserId) {
  return request(`/api/admin/shops/${shopId}/members/${shopUserId}`, { method: 'DELETE' });
}

export function listInvitations(shopId) {
  return request(`/api/admin/shops/${shopId}/members/invitations`);
}

export function revokeInvitation(shopId, invitationId) {
  return request(`/api/admin/shops/${shopId}/members/invitations/${invitationId}/revoke`, {
    method: 'POST',
  });
}
