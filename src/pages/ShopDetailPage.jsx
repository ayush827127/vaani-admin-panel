import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useParams, Link } from 'react-router-dom';
import * as shopsApi from '../api/shops';
import * as modulesApi from '../api/modules';
import StatusBadge from '../components/StatusBadge';
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
  const [activeTab, setActiveTab] = useState('overview');

  const shopQuery = useQuery({
    queryKey: ['shop', shopId],
    queryFn: () => shopsApi.getShop(shopId),
  });
  const modulesQuery = useQuery({ queryKey: ['modules'], queryFn: modulesApi.listModules });

  const setStatusMutation = useMutation({
    mutationFn: (status) => shopsApi.setShopStatus(shopId, status),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['shop', shopId] }),
  });

  const invalidateShop = () => queryClient.invalidateQueries({ queryKey: ['shop', shopId] });

  const uploadLogoMutation = useMutation({
    mutationFn: (file) => shopsApi.uploadShopLogo(shopId, file),
    onSuccess: invalidateShop,
  });
  const deleteLogoMutation = useMutation({
    mutationFn: () => shopsApi.deleteShopLogo(shopId),
    onSuccess: invalidateShop,
  });

  if (shopQuery.isLoading) return <p className="text-sm text-gray-500">Loading…</p>;
  if (shopQuery.error) return <p className="text-sm text-red-600">{shopQuery.error.message}</p>;

  const shop = shopQuery.data;

  return (
    <div className="space-y-6">
      <Link to="/shops" className="text-sm text-purple-700 hover:underline">
        ← Back to shops
      </Link>

      <div className="rounded-lg border border-gray-200 bg-white p-5">
        <div className="mb-4 flex items-start justify-between">
          <div className="flex items-start gap-3">
            <ShopLogo
              logoUrl={shop.logoUrl}
              busy={uploadLogoMutation.isPending || deleteLogoMutation.isPending}
              onUpload={(file) => uploadLogoMutation.mutate(file)}
              onRemove={() => deleteLogoMutation.mutate()}
            />
            <div>
              <h1 className="text-xl font-semibold text-gray-900">{shop.name}</h1>
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
              onChange={(e) => e.target.value && setStatusMutation.mutate(e.target.value)}
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
        <nav className="-mb-px flex gap-4">
          {TABS.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`border-b-2 px-1 py-2 text-sm font-medium ${
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
    </div>
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
        <div className="flex h-12 w-12 items-center justify-center rounded-full border border-dashed border-gray-300 text-[10px] text-gray-400">
          No logo
        </div>
      )}
      <label
        className="absolute inset-0 flex cursor-pointer items-center justify-center rounded-full bg-black/50 text-[10px] text-white opacity-0 transition-opacity group-hover:opacity-100"
        title={busy ? 'Working…' : 'Change logo'}
      >
        {busy ? '…' : 'Edit'}
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
          className="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full bg-red-600 text-[10px] leading-none text-white hover:bg-red-700"
        >
          ×
        </button>
      )}
    </div>
  );
}
