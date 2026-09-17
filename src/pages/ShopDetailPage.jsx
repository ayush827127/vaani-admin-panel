import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useParams, Link } from 'react-router-dom';
import { ArrowLeft, Pencil, ImageUp, X } from 'lucide-react';
import * as shopsApi from '../api/shops';
import * as modulesApi from '../api/modules';
import StatusBadge from '../components/StatusBadge';
import Modal from '../components/Modal';
import Field from '../components/Field';
import ConfirmDialog from '../components/ConfirmDialog';
import { useToast } from '../components/ToastContext';
import OverviewTab from './shop-tabs/OverviewTab';
import ProductsTab from './shop-tabs/ProductsTab';
import CustomersTab from './shop-tabs/CustomersTab';
import InvoicesTab from './shop-tabs/InvoicesTab';
import PaymentsTab from './shop-tabs/PaymentsTab';

const SHOP_STATUS_OPTIONS = ['TRIAL', 'ACTIVE', 'SUSPENDED', 'CANCELLED'];

const TABS = [
  { key: 'overview', label: 'Overview' },
  { key: 'products', label: 'Products' },
  { key: 'customers', label: 'Customers' },
  { key: 'invoices', label: 'Invoices' },
  { key: 'payments', label: 'Payments' },
];

export default function ShopDetailPage() {
  const { shopId } = useParams();
  const queryClient = useQueryClient();
  const toast = useToast();
  const [activeTab, setActiveTab] = useState('overview');
  const [showEdit, setShowEdit] = useState(false);
  const [pendingStatus, setPendingStatus] = useState(null);

  const shopQuery = useQuery({
    queryKey: ['shop', shopId],
    queryFn: () => shopsApi.getShop(shopId),
  });
  const modulesQuery = useQuery({ queryKey: ['modules'], queryFn: modulesApi.listModules });

  const invalidateShop = () => queryClient.invalidateQueries({ queryKey: ['shop', shopId] });

  const setStatusMutation = useMutation({
    mutationFn: (status) => shopsApi.setShopStatus(shopId, status),
    onSuccess: (_, status) => {
      invalidateShop();
      queryClient.invalidateQueries({ queryKey: ['shops'] });
      setPendingStatus(null);
      toast.success(`Status changed to ${status}`);
    },
    onError: (err) => toast.error(err.message),
  });

  const updateShopMutation = useMutation({
    mutationFn: (data) => shopsApi.updateShop(shopId, data),
    onSuccess: () => {
      invalidateShop();
      queryClient.invalidateQueries({ queryKey: ['shops'] });
      setShowEdit(false);
      toast.success('Shop details updated');
    },
    onError: (err) => toast.error(err.message),
  });

  const uploadLogoMutation = useMutation({
    mutationFn: (file) => shopsApi.uploadShopLogo(shopId, file),
    onSuccess: invalidateShop,
    onError: (err) => toast.error(err.message),
  });
  const deleteLogoMutation = useMutation({
    mutationFn: () => shopsApi.deleteShopLogo(shopId),
    onSuccess: invalidateShop,
    onError: (err) => toast.error(err.message),
  });

  if (shopQuery.isLoading) return <p className="text-sm text-gray-500">Loading…</p>;
  if (shopQuery.error) return <p className="text-sm text-red-600">{shopQuery.error.message}</p>;

  const shop = shopQuery.data;

  return (
    <div className="space-y-6">
      <Link to="/shops" className="flex items-center gap-1 text-sm text-purple-700 hover:underline">
        <ArrowLeft size={14} /> Back to shops
      </Link>

      <div className="rounded-lg border border-gray-200 bg-white p-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex items-start gap-3">
            <ShopLogo
              logoUrl={shop.logoUrl}
              busy={uploadLogoMutation.isPending || deleteLogoMutation.isPending}
              onUpload={(file) => uploadLogoMutation.mutate(file)}
              onRemove={() => deleteLogoMutation.mutate()}
            />
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-semibold text-gray-900">{shop.name}</h1>
                <button
                  onClick={() => setShowEdit(true)}
                  title="Edit shop details"
                  className="rounded-md p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
                >
                  <Pencil size={14} />
                </button>
              </div>
              <p className="text-sm text-gray-500">
                {shop.ownerName} · {shop.phone}
                {shop.email ? ` · ${shop.email}` : ''}
              </p>
              {shop.address && <p className="text-sm text-gray-500">{shop.address}</p>}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <StatusBadge status={shop.status} />
            <select
              value=""
              onChange={(e) => e.target.value && setPendingStatus(e.target.value)}
              className="rounded-md border border-gray-300 px-2 py-1 text-xs"
            >
              <option value="">Change status…</option>
              {SHOP_STATUS_OPTIONS.filter((s) => s !== shop.status).map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      <div className="border-b border-gray-200">
        <nav className="-mb-px flex gap-4 overflow-x-auto">
          {TABS.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`whitespace-nowrap border-b-2 px-1 py-2 text-sm font-medium ${
                activeTab === tab.key
                  ? 'border-purple-600 text-purple-700'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {activeTab === 'overview' && (
        <OverviewTab shopId={shopId} shop={shop} modules={modulesQuery.data ?? []} />
      )}
      {activeTab === 'products' && <ProductsTab shopId={shopId} />}
      {activeTab === 'customers' && <CustomersTab shopId={shopId} />}
      {activeTab === 'invoices' && <InvoicesTab shopId={shopId} />}
      {activeTab === 'payments' && <PaymentsTab shopId={shopId} />}

      {showEdit && (
        <EditShopModal
          shop={shop}
          onClose={() => setShowEdit(false)}
          onSubmit={(data) => updateShopMutation.mutate(data)}
          submitting={updateShopMutation.isPending}
          error={updateShopMutation.error}
        />
      )}

      {pendingStatus && (
        <ConfirmDialog
          title="Change shop status?"
          message={`This immediately changes what "${shop.name}" can access — moving to ${pendingStatus} ${
            pendingStatus === 'SUSPENDED' || pendingStatus === 'CANCELLED'
              ? 'will lock the shop out of the app.'
              : 'takes effect right away.'
          }`}
          confirmLabel={`Change to ${pendingStatus}`}
          tone={pendingStatus === 'SUSPENDED' || pendingStatus === 'CANCELLED' ? 'danger' : 'primary'}
          busy={setStatusMutation.isPending}
          onConfirm={() => setStatusMutation.mutate(pendingStatus)}
          onClose={() => setPendingStatus(null)}
        />
      )}
    </div>
  );
}

function EditShopModal({ shop, onClose, onSubmit, submitting, error }) {
  const [form, setForm] = useState({
    name: shop.name ?? '',
    ownerName: shop.ownerName ?? '',
    phone: shop.phone ?? '',
    email: shop.email ?? '',
    address: shop.address ?? '',
  });

  function handleChange(field) {
    return (e) => setForm((f) => ({ ...f, [field]: e.target.value }));
  }

  function handleSubmit(e) {
    e.preventDefault();
    const payload = { ...form };
    if (!payload.email) payload.email = null;
    if (!payload.address) payload.address = null;
    onSubmit(payload);
  }

  return (
    <Modal title="Edit shop details" onClose={onClose}>
      <form onSubmit={handleSubmit} className="space-y-3">
        {error && (
          <div className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{error.message}</div>
        )}
        <Field label="Shop name" value={form.name} onChange={handleChange('name')} required />
        <Field label="Owner name" value={form.ownerName} onChange={handleChange('ownerName')} required />
        <Field label="Phone" value={form.phone} onChange={handleChange('phone')} required />
        <Field label="Email" value={form.email} onChange={handleChange('email')} type="email" />
        <Field label="Address" value={form.address} onChange={handleChange('address')} />
        <button
          type="submit"
          disabled={submitting}
          className="w-full rounded-md bg-purple-600 px-4 py-2 text-sm font-medium text-white hover:bg-purple-700 disabled:opacity-50"
        >
          {submitting ? 'Saving…' : 'Save changes'}
        </button>
      </form>
    </Modal>
  );
}

function ShopLogo({ logoUrl, busy, onUpload, onRemove }) {
  function handleFileChange(e) {
    const file = e.target.files?.[0];
    e.target.value = ''; // allow re-selecting the same file later
    if (file) onUpload(file);
  }

  return (
    <div className="group relative h-12 w-12 shrink-0">
      {logoUrl ? (
        <img
          src={logoUrl}
          alt=""
          className="h-12 w-12 rounded-full border border-gray-200 object-cover"
        />
      ) : (
        <div className="flex h-12 w-12 items-center justify-center rounded-full border border-dashed border-gray-300 text-gray-400">
          <ImageUp size={16} />
        </div>
      )}
      <label
        className="absolute inset-0 flex cursor-pointer items-center justify-center rounded-full bg-black/50 text-white opacity-0 transition-opacity group-hover:opacity-100"
        title={busy ? 'Working…' : 'Change logo'}
      >
        {busy ? (
          <span className="text-[10px]">…</span>
        ) : (
          <Pencil size={13} />
        )}
        <input
          type="file"
          accept="image/*"
          className="hidden"
          disabled={busy}
          onChange={handleFileChange}
        />
      </label>
      {logoUrl && !busy && (
        <button
          onClick={onRemove}
          title="Remove logo"
          className="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full bg-red-600 text-white hover:bg-red-700"
        >
          <X size={10} />
        </button>
      )}
    </div>
  );
}
