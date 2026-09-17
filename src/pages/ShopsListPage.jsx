import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { Plus, ArrowRight } from 'lucide-react';
import * as shopsApi from '../api/shops';
import StatusBadge from '../components/StatusBadge';
import Modal from '../components/Modal';
import Field from '../components/Field';
import SearchBar from '../components/SearchBar';
import Pagination from '../components/Pagination';
import { useToast } from '../components/ToastContext';

const STATUS_OPTIONS = ['TRIAL', 'ACTIVE', 'SUSPENDED', 'CANCELLED'];
const LIMIT = 20;

export default function ShopsListPage() {
  const [statusFilter, setStatusFilter] = useState('');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [showCreate, setShowCreate] = useState(false);
  const queryClient = useQueryClient();
  const toast = useToast();

  const { data, isLoading, error } = useQuery({
    queryKey: ['shops', statusFilter, search, page],
    queryFn: () =>
      shopsApi.listShops({ status: statusFilter || undefined, search: search || undefined, page, limit: LIMIT }),
  });

  const createMutation = useMutation({
    mutationFn: shopsApi.createShop,
    onSuccess: (shop) => {
      queryClient.invalidateQueries({ queryKey: ['shops'] });
      setShowCreate(false);
      toast.success(`${shop.name} created`);
    },
    onError: (err) => toast.error(err.message),
  });

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold text-gray-900">Shops</h1>
          <p className="mt-0.5 text-sm text-gray-500">{data?.total ?? '—'} total</p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <SearchBar
            value={search}
            onChange={(v) => {
              setSearch(v);
              setPage(1);
            }}
            placeholder="Search name, owner, phone…"
          />
          <select
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value);
              setPage(1);
            }}
            className="rounded-md border border-gray-300 px-3 py-1.5 text-sm"
          >
            <option value="">All statuses</option>
            {STATUS_OPTIONS.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
          <button
            onClick={() => setShowCreate(true)}
            className="flex items-center gap-1.5 rounded-md bg-purple-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-purple-700"
          >
            <Plus size={15} />
            New shop
          </button>
        </div>
      </div>

      {isLoading && <p className="text-sm text-gray-500">Loading…</p>}
      {error && <p className="text-sm text-red-600">{error.message}</p>}

      {data && (
        <div className="overflow-hidden rounded-lg border border-gray-200 bg-white">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-gray-200 bg-gray-50 text-xs uppercase text-gray-500">
                <tr>
                  <th className="px-4 py-2.5">Name</th>
                  <th className="px-4 py-2.5">Owner</th>
                  <th className="px-4 py-2.5">Phone</th>
                  <th className="px-4 py-2.5">Status</th>
                  <th className="px-4 py-2.5">Plan</th>
                  <th className="px-4 py-2.5"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {data.items.map((shop) => (
                  <tr key={shop.id} className="group hover:bg-gray-50">
                    <td className="px-4 py-2.5">
                      <Link to={`/shops/${shop.id}`} className="font-medium text-purple-700 hover:underline">
                        {shop.name}
                      </Link>
                    </td>
                    <td className="px-4 py-2.5 text-gray-700">{shop.ownerName}</td>
                    <td className="px-4 py-2.5 text-gray-700">{shop.phone}</td>
                    <td className="px-4 py-2.5">
                      <StatusBadge status={shop.status} />
                    </td>
                    <td className="px-4 py-2.5 text-gray-700">
                      {shop.subscriptions?.[0]?.plan?.name ?? 'Basic'}
                    </td>
                    <td className="px-4 py-2.5 text-right">
                      <Link
                        to={`/shops/${shop.id}`}
                        className="inline-flex items-center gap-0.5 text-xs text-gray-400 opacity-0 group-hover:opacity-100"
                      >
                        View <ArrowRight size={12} />
                      </Link>
                    </td>
                  </tr>
                ))}
                {data.items.length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-4 py-8 text-center text-gray-400">
                      No shops found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          <Pagination page={page} limit={LIMIT} total={data.total} onPageChange={setPage} />
        </div>
      )}

      {showCreate && (
        <CreateShopModal
          onClose={() => setShowCreate(false)}
          onSubmit={(data) => createMutation.mutate(data)}
          submitting={createMutation.isPending}
          error={createMutation.error}
        />
      )}
    </div>
  );
}

function CreateShopModal({ onClose, onSubmit, submitting, error }) {
  const [form, setForm] = useState({ name: '', ownerName: '', phone: '', email: '', address: '' });

  function handleChange(field) {
    return (e) => setForm((f) => ({ ...f, [field]: e.target.value }));
  }

  function handleSubmit(e) {
    e.preventDefault();
    const payload = { ...form };
    if (!payload.email) delete payload.email;
    if (!payload.address) delete payload.address;
    onSubmit(payload);
  }

  return (
    <Modal title="New shop" onClose={onClose}>
      <form onSubmit={handleSubmit} className="space-y-3">
        {error && (
          <div className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{error.message}</div>
        )}
        <Field label="Shop name" value={form.name} onChange={handleChange('name')} required />
        <Field label="Owner name" value={form.ownerName} onChange={handleChange('ownerName')} required />
        <Field label="Phone" value={form.phone} onChange={handleChange('phone')} required />
        <Field label="Email (optional)" value={form.email} onChange={handleChange('email')} type="email" />
        <Field label="Address (optional)" value={form.address} onChange={handleChange('address')} />
        <button
          type="submit"
          disabled={submitting}
          className="w-full rounded-md bg-purple-600 px-4 py-2 text-sm font-medium text-white hover:bg-purple-700 disabled:opacity-50"
        >
          {submitting ? 'Creating…' : 'Create shop'}
        </button>
      </form>
    </Modal>
  );
}
