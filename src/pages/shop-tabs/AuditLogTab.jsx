import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import * as auditLogApi from '../../api/auditLog';
import Pagination from '../../components/Pagination';

const LIMIT = 50;

// Highlights the conflict-detection and permission-rejection event types
// specifically — those are the ones that actually need an admin's eyes
// (something unusual happened), vs. the routine CREATE_/UPDATE_/DELETE_*
// rows that are mostly just a paper trail.
const NOTABLE_ACTIONS = new Set([
  'INVENTORY_CONFLICT_DETECTED',
  'FINANCIAL_CONFLICT_DETECTED',
  'INVOICE_NUMBER_CONFLICT_DETECTED',
  'SYNC_RECORD_REJECTED_INSUFFICIENT_PERMISSION',
]);

export default function AuditLogTab({ shopId }) {
  const [page, setPage] = useState(1);

  const query = useQuery({
    queryKey: ['audit-log', shopId, page],
    queryFn: () => auditLogApi.listAuditLog(shopId, { page, limit: LIMIT }),
  });

  return (
    <div>
      {query.isLoading && <p className="text-sm text-gray-500">Loading…</p>}
      {query.error && <p className="text-sm text-red-600">{query.error.message}</p>}

      {query.data && (
        <div className="overflow-hidden rounded-lg border border-gray-200 bg-white">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-gray-200 bg-gray-50 text-xs uppercase text-gray-500">
              <tr>
                <th className="px-4 py-2.5">When</th>
                <th className="px-4 py-2.5">Action</th>
                <th className="px-4 py-2.5">Entity</th>
                <th className="px-4 py-2.5">Details</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {query.data.entries.map((entry) => (
                <tr
                  key={entry.id}
                  className={NOTABLE_ACTIONS.has(entry.action) ? 'bg-amber-50 hover:bg-amber-100' : 'hover:bg-gray-50'}
                >
                  <td className="whitespace-nowrap px-4 py-2.5 text-gray-500">
                    {new Date(entry.createdAt).toLocaleString()}
                  </td>
                  <td className="px-4 py-2.5 font-medium text-gray-900">{entry.action}</td>
                  <td className="px-4 py-2.5 text-gray-600">
                    {entry.entityType ?? '—'}
                    {entry.entityId ? ` · ${entry.entityId.slice(0, 8)}` : ''}
                  </td>
                  <td className="max-w-md px-4 py-2.5 text-xs text-gray-500">
                    {entry.metadata ? (
                      <code className="break-words">{JSON.stringify(entry.metadata)}</code>
                    ) : (
                      '—'
                    )}
                  </td>
                </tr>
              ))}
              {query.data.entries.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-4 py-8 text-center text-gray-400">
                    No audit history yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
          <Pagination page={page} limit={LIMIT} total={query.data.total} onPageChange={setPage} />
        </div>
      )}
    </div>
  );
}
