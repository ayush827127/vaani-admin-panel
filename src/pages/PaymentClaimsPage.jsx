import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import * as claimsApi from '../api/paymentClaims';
import Modal from '../components/Modal';
import Pagination from '../components/Pagination';
import StatusBadge from '../components/StatusBadge';
import ConfirmDialog from '../components/ConfirmDialog';
import { useToast } from '../components/ToastContext';

const LIMIT = 20;
const TABS = ['PENDING', 'CONFIRMED', 'REJECTED', 'ALL'];

export default function PaymentClaimsPage() {
  const queryClient = useQueryClient();
  const toast = useToast();
  const [tab, setTab] = useState('PENDING');
  const [page, setPage] = useState(1);
  const [confirmingClaim, setConfirmingClaim] = useState(null);
  const [rejectingClaim, setRejectingClaim] = useState(null);

  const query = useQuery({
    queryKey: ['payment-claims', tab, page],
    queryFn: () => claimsApi.listPaymentClaims({ status: tab === 'ALL' ? undefined : tab, page, limit: LIMIT }),
  });

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['payment-claims'] });

  const confirmMutation = useMutation({
    mutationFn: claimsApi.confirmPaymentClaim,
    onSuccess: () => {
      invalidate();
      setConfirmingClaim(null);
      toast.success(`Payment confirmed — ${confirmingClaim?.shop.name} moved to ${confirmingClaim?.plan.name}`);
    },
    onError: (err) => toast.error(err.message),
  });

  const rejectMutation = useMutation({
    mutationFn: ({ id, note }) => claimsApi.rejectPaymentClaim(id, note),
    onSuccess: () => {
      invalidate();
      setRejectingClaim(null);
      toast.success('Claim rejected');
    },
    onError: (err) => toast.error(err.message),
  });

  function switchTab(t) {
    setTab(t);
    setPage(1);
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-xl font-semibold text-gray-900">Payment Claims</h1>
        <p className="mt-1 text-sm text-gray-500">
          A shop submits a claim after paying via UPI — nothing activates until you confirm the
          money actually arrived. Check your UPI app / bank statement for the amount and
          reference before confirming.
        </p>
      </div>

      <div className="mb-4 flex gap-1">
        {TABS.map((t) => (
          <button
            key={t}
            onClick={() => switchTab(t)}
            className={`rounded-md px-3 py-1.5 text-sm font-medium ${
              tab === t ? 'bg-purple-100 text-purple-700' : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            {t.charAt(0) + t.slice(1).toLowerCase()}
          </button>
        ))}
      </div>

      {query.isLoading && <p className="text-sm text-gray-500">Loading…</p>}
      {query.error && <p className="text-sm text-red-600">{query.error.message}</p>}

      {query.data && (
        <div className="overflow-hidden rounded-lg border border-gray-200 bg-white">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-gray-200 bg-gray-50 text-xs uppercase text-gray-500">
              <tr>
                <th className="px-4 py-2.5">Shop</th>
                <th className="px-4 py-2.5">Plan</th>
                <th className="px-4 py-2.5">Amount</th>
                <th className="px-4 py-2.5">Reference</th>
                <th className="px-4 py-2.5">Submitted</th>
                <th className="px-4 py-2.5">Status</th>
                <th className="px-4 py-2.5"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {query.data.items.map((c) => (
                <tr key={c.id} className="hover:bg-gray-50">
                  <td className="px-4 py-2.5">
                    <div className="font-medium text-gray-900">{c.shop.name}</div>
                    <div className="text-xs text-gray-500">{c.shop.phone}</div>
                  </td>
                  <td className="px-4 py-2.5 text-gray-700">{c.plan.name}</td>
                  <td className="px-4 py-2.5 text-gray-700">₹{c.amount}</td>
                  <td className="px-4 py-2.5 font-mono text-xs text-gray-500">{c.reference}</td>
                  <td className="px-4 py-2.5 text-gray-500">
                    {new Date(c.createdAt).toLocaleString()}
                  </td>
                  <td className="px-4 py-2.5">
                    <StatusBadge status={c.status} />
                  </td>
                  <td className="px-4 py-2.5 text-right text-xs">
                    {c.status === 'PENDING' && (
                      <div className="flex justify-end gap-3">
                        <button
                          onClick={() => setConfirmingClaim(c)}
                          className="text-green-700 hover:underline"
                        >
                          Confirm
                        </button>
                        <button
                          onClick={() => setRejectingClaim(c)}
                          className="text-red-600 hover:underline"
                        >
                          Reject
                        </button>
                      </div>
                    )}
                    {c.status !== 'PENDING' && c.reviewedBy && (
                      <span className="text-gray-400">by {c.reviewedBy}</span>
                    )}
                  </td>
                </tr>
              ))}
              {query.data.items.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-gray-400">
                    No {tab === 'ALL' ? '' : tab.toLowerCase()} payment claims.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
          <Pagination page={page} limit={LIMIT} total={query.data.total} onPageChange={setPage} />
        </div>
      )}

      {confirmingClaim && (
        <ConfirmDialog
          title="Confirm this payment?"
          message={`This activates the ${confirmingClaim.plan.name} plan (₹${confirmingClaim.amount}) for ${confirmingClaim.shop.name} immediately. Only confirm after verifying the UPI credit (ref ${confirmingClaim.reference}) actually arrived in your account.`}
          confirmLabel="Yes, payment received"
          tone="primary"
          busy={confirmMutation.isPending}
          onConfirm={() => confirmMutation.mutate(confirmingClaim.id)}
          onClose={() => setConfirmingClaim(null)}
        />
      )}

      {rejectingClaim && (
        <RejectModal
          claim={rejectingClaim}
          onClose={() => setRejectingClaim(null)}
          onSubmit={(note) => rejectMutation.mutate({ id: rejectingClaim.id, note })}
          submitting={rejectMutation.isPending}
          error={rejectMutation.error}
        />
      )}
    </div>
  );
}

function RejectModal({ claim, onClose, onSubmit, submitting, error }) {
  const [note, setNote] = useState('');

  function handleSubmit(e) {
    e.preventDefault();
    onSubmit(note || undefined);
  }

  return (
    <Modal title={`Reject claim from ${claim.shop.name}?`} onClose={onClose}>
      <form onSubmit={handleSubmit} className="space-y-3">
        {error && (
          <div className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{error.message}</div>
        )}
        <p className="text-sm text-gray-600">
          {claim.plan.name} · ₹{claim.amount} · ref {claim.reference}
        </p>
        <label className="block">
          <span className="mb-1 block text-sm font-medium text-gray-700">Reason (optional)</span>
          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            rows={3}
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
            placeholder="e.g. amount didn't match, no matching UPI credit found"
          />
        </label>
        <button
          type="submit"
          disabled={submitting}
          className="w-full rounded-md bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50"
        >
          {submitting ? 'Rejecting…' : 'Reject claim'}
        </button>
      </form>
    </Modal>
  );
}
