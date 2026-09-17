import { request } from './client';

export function getDashboardSummary() {
  return request('/api/admin/dashboard/summary');
}
