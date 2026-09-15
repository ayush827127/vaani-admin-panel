import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import * as customersApi from '../../api/syncedCustomers';
import Modal from '../../components/Modal';
import Field from '../../components/Field';
import SearchBar from '../../components/SearchBar';
import Pagination from '../../components/Pagination';

const LIMIT = 20;

export default function CustomersTab({ shopId }) {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [modalCustomer, setModalCustomer] = useState(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState(null);

  const query = useQuery({
    queryKey: ['customers', shopId, search, page],
    queryFn: () => customersApi.listCustomers(shopId, { search, page, limit: LIMIT }),
  });

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['customers', shopId] });

  const saveMutation = useMutation({
    mutationFn: ({ id, data }) =>
      id ? customersApi.updateCustomer(shopId, id, data) : customersApi.createCustomer(shopId, data),
    onSuccess: () => {
      invalidate();
      setModalCustomer(null);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => customersApi.deleteCustomer(shopId, id),
    onSuccess: () => {
      invalidate();
      setConfirmDeleteId(null);
    },
  });

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <SearchBar
          value={search}
          onChange={(v) => {
            setSearch(v);
            setPage(1);
          }}
          placeholder="Search name, phone…"
        />
        <button
          onClick={() => setModalCustomer({})}
          className="rounded-md bg-purple-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-purple-700"
        >
          New customer
        </button>
      </div>

      {query.isLoading && <p className="text-sm text-gray-500">Loading…</p>}
      {query.error && <p className="text-sm text-red-600">{query.error.message}</p>}

      {query.data && (
        <div className="overflow-hidden rounded-lg border border-gray-200 bg-white">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-gray-200 bg-gray-50 text-xs uppercase text-gray-500">
              <tr>
                <th className="px-4 py-2.5">Name</th>
                <th className="px-4 py-2.5">Phone</th>
                <th className="px-4 py-2.5">Total purchases</th>
                <th className="px-4 py-2.5">Outstanding</th>
                <th className="px-4 py-2.5"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {query.data.items.map((c) => (
                <tr key={c.id} className="hover:bg-gray-50">
                  <td className="px-4 py-2.5 font-medium text-gray-900">{c.name}</td>
                  <td className="px-4 py-2.5 text-gray-600">{c.phone ?? '—'}</td>
                  <td className="px-4 py-2.5 text-gray-700">₹{c.totalPurchases}</td>
                  <td className="px-4 py-2.5 text-gray-700">₹{c.totalOutstanding}</td>
                  <td className="px-4 py-2.5 text-right text-xs">
                    <button
                      onClick={() => setModalCustomer(c)}
                      className="mr-3 text-purple-700 hover:underline"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => setConfirmDeleteId(c.id)}
                      className="text-red-600 hover:underline"
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
              {query.data.items.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-gray-400">
                    No customers found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
          <Pagination page={page} limit={LIMIT} total={query.data.total} onPageChange={setPage} />
        </div>
      )}

      {modalCustomer && (
        <CustomerFormModal
          customer={modalCustomer.id ? modalCustomer : null}
          onClose={() => setModalCustomer(null)}
          onSubmit={(data) => saveMutation.mutate({ id: modalCustomer.id, data })}
          submitting={saveMutation.isPending}
          error={saveMutation.error}
        />
      )}

      {confirmDeleteId && (
        <Modal title="Delete customer?" onClose={() => setConfirmDeleteId(null)}>
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

function CustomerFormModal({ customer, onClose, onSubmit, submitting, error }) {
  const [form, setForm] = useState({
    name: customer?.name ?? '',
    phone: customer?.phone ?? '',
    email: customer?.email ?? '',
    address: customer?.address ?? '',
  });

  function handleChange(field) {
    return (e) => setForm((f) => ({ ...f, [field]: e.target.value }));
  }

  function handleSubmit(e) {
    e.preventDefault();
    onSubmit({
      ...form,
      phone: form.phone || null,
      email: form.email || null,
      address: form.address || null,
    });
  }

  return (
    <Modal title={customer ? 'Edit customer' : 'New customer'} onClose={onClose}>
      <form onSubmit={handleSubmit} className="space-y-3">
        {error && (
          <div className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{error.message}</div>
        )}
        <Field label="Name" value={form.name} onChange={handleChange('name')} required />
        <div className="grid grid-cols-2 gap-3">
          <Field label="Phone" value={form.phone} onChange={handleChange('phone')} />
          <Field label="Email" type="email" value={form.email} onChange={handleChange('email')} />
        </div>
        <Field label="Address" value={form.address} onChange={handleChange('address')} />
        {customer && (
          <p className="text-xs text-gray-400">
            Total purchases, outstanding, and advance balance are calculated from real
            transactions and can't be edited directly.
          </p>
        )}
        <button
          type="submit"
          disabled={submitting}
          className="w-full rounded-md bg-purple-600 px-4 py-2 text-sm font-medium text-white hover:bg-purple-700 disabled:opacity-50"
        >
          {submitting ? 'Saving…' : customer ? 'Save changes' : 'Create customer'}
        </button>
      </form>
    </Modal>
  );
}
