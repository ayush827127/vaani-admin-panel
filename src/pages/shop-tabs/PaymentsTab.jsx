import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import * as paymentsApi from '../../api/syncedPayments';
import * as customersApi from '../../api/syncedCustomers';
import Modal from '../../components/Modal';
import Field from '../../components/Field';
import SearchBar from '../../components/SearchBar';
import Pagination from '../../components/Pagination';
import { useToast } from '../../components/ToastContext';

const LIMIT = 20;
const PAYMENT_TYPES = ['bill_payment', 'advance_used', 'outstanding_collection', 'advance_deposit'];

export default function PaymentsTab({ shopId }) {
  const queryClient = useQueryClient();
  const toast = useToast();
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [modalPayment, setModalPayment] = useState(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState(null);

  const query = useQuery({
    queryKey: ['payments', shopId, search, page],
    queryFn: () => paymentsApi.listPayments(shopId, { search, page, limit: LIMIT }),
  });
  const customersQuery = useQuery({
    queryKey: ['customers', shopId, 'all-for-payment'],
    queryFn: () => customersApi.listCustomers(shopId, { limit: 200 }),
  });

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['payments', shopId] });

  const saveMutation = useMutation({
    mutationFn: ({ id, data }) =>
      id ? paymentsApi.updatePayment(shopId, id, data) : paymentsApi.createPayment(shopId, data),
    onSuccess: (_, { id }) => {
      invalidate();
      setModalPayment(null);
      toast.success(id ? 'Payment updated' : 'Payment recorded');
    },
    onError: (err) => toast.error(err.message),
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => paymentsApi.deletePayment(shopId, id),
    onSuccess: () => {
      invalidate();
      setConfirmDeleteId(null);
      toast.success('Payment deleted');
    },
    onError: (err) => toast.error(err.message),
  });

  const customerName = (localCustomerId) =>
    customersQuery.data?.items.find((c) => c.localId === localCustomerId)?.name ?? `#${localCustomerId}`;

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <SearchBar
          value={search}
          onChange={(v) => {
            setSearch(v);
            setPage(1);
          }}
          placeholder="Search type, notes…"
        />
        <button
          onClick={() => setModalPayment({})}
          className="rounded-md bg-purple-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-purple-700"
        >
          New payment
        </button>
      </div>

      {query.isLoading && <p className="text-sm text-gray-500">Loading…</p>}
      {query.error && <p className="text-sm text-red-600">{query.error.message}</p>}

      {query.data && (
        <div className="overflow-hidden rounded-lg border border-gray-200 bg-white">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-gray-200 bg-gray-50 text-xs uppercase text-gray-500">
              <tr>
                <th className="px-4 py-2.5">Customer</th>
                <th className="px-4 py-2.5">Type</th>
                <th className="px-4 py-2.5">Amount</th>
                <th className="px-4 py-2.5">Mode</th>
                <th className="px-4 py-2.5">Date</th>
                <th className="px-4 py-2.5"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {query.data.items.map((p) => (
                <tr key={p.id} className="hover:bg-gray-50">
                  <td className="px-4 py-2.5 font-medium text-gray-900">
                    {customerName(p.localCustomerId)}
                  </td>
                  <td className="px-4 py-2.5 text-gray-600">{p.type}</td>
                  <td className="px-4 py-2.5 text-gray-700">₹{p.amount}</td>
                  <td className="px-4 py-2.5 text-gray-600">{p.paymentMode}</td>
                  <td className="px-4 py-2.5 text-gray-500">
                    {new Date(p.localCreatedAt).toLocaleDateString()}
                  </td>
                  <td className="px-4 py-2.5 text-right text-xs">
                    <button
                      onClick={() => setModalPayment(p)}
                      className="mr-3 text-purple-700 hover:underline"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => setConfirmDeleteId(p.id)}
                      className="text-red-600 hover:underline"
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
              {query.data.items.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-gray-400">
                    No payments found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
          <Pagination page={page} limit={LIMIT} total={query.data.total} onPageChange={setPage} />
        </div>
      )}

      {modalPayment && (
        <PaymentFormModal
          payment={modalPayment.id ? modalPayment : null}
          customers={customersQuery.data?.items ?? []}
          onClose={() => setModalPayment(null)}
          onSubmit={(data) => saveMutation.mutate({ id: modalPayment.id, data })}
          submitting={saveMutation.isPending}
          error={saveMutation.error}
        />
      )}

      {confirmDeleteId && (
        <Modal title="Delete payment?" onClose={() => setConfirmDeleteId(null)}>
          <p className="mb-4 text-sm text-gray-600">
            This will also remove it from the shop's phone the next time it syncs. This cannot
            be undone.
          </p>
          <div className="flex justify-end gap-2">
            <button
              onClick={() => setConfirmDeleteId(null)}
              className="rounded-md border border-gray-300 px-3 py-1.5 text-sm"
            >
              Cancel
            </button>
            <button
              onClick={() => deleteMutation.mutate(confirmDeleteId)}
              disabled={deleteMutation.isPending}
              className="rounded-md bg-red-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-red-700"
            >
              Delete
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
}

function PaymentFormModal({ payment, customers, onClose, onSubmit, submitting, error }) {
  const [form, setForm] = useState({
    customerId: payment?.localCustomerId ?? customers[0]?.localId ?? '',
    type: payment?.type ?? 'bill_payment',
    amount: payment?.amount ?? 0,
    paymentMode: payment?.paymentMode ?? 'cash',
    notes: payment?.notes ?? '',
  });

  function handleChange(field) {
    return (e) => setForm((f) => ({ ...f, [field]: e.target.value }));
  }

  function handleSubmit(e) {
    e.preventDefault();
    onSubmit({
      customerId: Number(form.customerId),
      type: form.type,
      amount: Number(form.amount),
      paymentMode: form.paymentMode,
      notes: form.notes || null,
    });
  }

  return (
    <Modal title={payment ? 'Edit payment' : 'New payment'} onClose={onClose}>
      <form onSubmit={handleSubmit} className="space-y-3">
        {error && (
          <div className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{error.message}</div>
        )}
        <label className="block">
          <span className="mb-1 block text-sm font-medium text-gray-700">Customer</span>
          <select
            value={form.customerId}
            onChange={handleChange('customerId')}
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
            required
          >
            <option value="">Select customer…</option>
            {customers.map((c) => (
              <option key={c.localId} value={c.localId}>
                {c.name}
              </option>
            ))}
          </select>
        </label>
        <label className="block">
          <span className="mb-1 block text-sm font-medium text-gray-700">Type</span>
          <select
            value={form.type}
            onChange={handleChange('type')}
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
          >
            {PAYMENT_TYPES.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
        </label>
        <div className="grid grid-cols-2 gap-3">
          <Field
            label="Amount"
            type="number"
            step="0.01"
            value={form.amount}
            onChange={handleChange('amount')}
            required
          />
          <label className="block">
            <span className="mb-1 block text-sm font-medium text-gray-700">Mode</span>
            <select
              value={form.paymentMode}
              onChange={handleChange('paymentMode')}
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
            >
              {['cash', 'upi', 'card', 'credit'].map((m) => (
                <option key={m} value={m}>
                  {m}
                </option>
              ))}
            </select>
          </label>
        </div>
        <Field label="Notes" value={form.notes} onChange={handleChange('notes')} />
        <button
          type="submit"
          disabled={submitting}
          className="w-full rounded-md bg-purple-600 px-4 py-2 text-sm font-medium text-white hover:bg-purple-700 disabled:opacity-50"
        >
          {submitting ? 'Saving…' : payment ? 'Save changes' : 'Create payment'}
        </button>
      </form>
    </Modal>
  );
}
