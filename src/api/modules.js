import { request } from './client';

export function listModules() {
  return request('/api/admin/modules');
}
