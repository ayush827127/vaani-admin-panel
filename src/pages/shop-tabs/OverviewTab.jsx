import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import * as shopsApi from '../../api/shops';
import * as plansApi from '../../api/plans';
import * as subscriptionsApi from '../../api/subscriptions';
import * as shopUsersApi from '../../api/shopUsers';
import StatusBadge from '../../components/StatusBadge';
import Field from '../../components/Field';

const SUBSCRIPTION_STATUS_OPTIONS = ['TRIAL', 'ACTIVE', 'EXPIRED', 'CANCELLED'];
const SHOP_USER_ROLES = ['OWNER', 'MANAGER', 'CASHIER'];

export default function OverviewTab({ shopId, shop, modules }) {
  return (
    <div className="space-y-6">
      <SubscriptionsSection shopId={shopId} />
      <ModuleOverridesSection shopId={shopId} modules={modules} overrides={shop.moduleOverrides} />
      <ShopUsersSection shopId={shopId} modules={modules} />
    </div>
  );
}

// ── Subscriptions ────────────────────────────────────────────────────────────

function SubscriptionsSection({ shopId }) {
  const queryClient = useQueryClient();
  const [showAssign, setShowAssign] = useState(false);

  const subsQuery = useQuery({
    queryKey: ['subscriptions', shopId],
    queryFn: () => subscriptionsApi.listSubscriptionsForShop(shopId),
  });
  const plansQuery = useQuery({ queryKey: ['plans'], queryFn: plansApi.listPlans });

  const createMutation = useMutation({
    mutationFn: subscriptionsApi.createSubscription,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['subscriptions', shopId] });
      queryClient.invalidateQueries({ queryKey: ['shop', shopId] });
      setShowAssign(false);
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => subscriptionsApi.updateSubscription(id, data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['subscriptions', shopId] }),
  });

  return (
    <div className="rounded-lg border border-gray-200 bg-white p-5">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-sm font-semibold text-gray-900">Subscriptions</h2>
        <button
          onClick={() => setShowAssign((v) => !v)}
          className="rounded-md bg-purple-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-purple-700"
        >
          Assign subscription
        </button>
      </div>

      {showAssign && plansQuery.data && (
        <AssignSubscriptionForm
          shopId={shopId}
          plans={plansQuery.data}
          onSubmit={(data) => createMutation.mutate(data)}
          submitting={createMutation.isPending}
          error={createMutation.error}
        />
      )}

      <div className="divide-y divide-gray-100">
        {subsQuery.data?.map((sub) => (
          <div key={sub.id} className="flex items-center justify-between py-2 text-sm">
            <div>
              <span className="font-medium text-gray-900">{sub.plan.name}</span>{' '}
              <span className="text-gray-500">
                · started {new Date(sub.startDate).toLocaleDateString()}
                {sub.endDate ? ` · ends ${new Date(sub.endDate).toLocaleDateString()}` : ''}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <StatusBadge status={sub.status} />
              <select
                value=""
                onChange={(e) =>
                  e.target.value &&
                  updateMutation.mutate({ id: sub.id, data: { status: e.target.value } })
                }
                className="rounded-md border border-gray-300 px-2 py-1 text-xs"
              >
                <option value="">Change…</option>
                {SUBSCRIPTION_STATUS_OPTIONS.filter((s) => s !== sub.status).map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </div>
          </div>
        ))}
        {subsQuery.data?.length === 0 && (
          <p className="py-2 text-sm text-gray-400">No subscriptions yet.</p>
        )}
      </div>
    </div>
  );
}

function AssignSubscriptionForm({ shopId, plans, onSubmit, submitting, error }) {
  const [planId, setPlanId] = useState(plans[0]?.id ?? '');
  const [status, setStatus] = useState('ACTIVE');

  function handleSubmit(e) {
    e.preventDefault();
    onSubmit({ shopId, planId, status });
  }

  return (
    <form onSubmit={handleSubmit} className="mb-4 flex items-end gap-3 rounded-md bg-gray-50 p-3">
      {error && <p className="text-sm text-red-600">{error.message}</p>}
      <label className="block">
        <span className="mb-1 block text-xs font-medium text-gray-700">Plan</span>
        <select
          value={planId}
          onChange={(e) => setPlanId(e.target.value)}
          className="rounded-md border border-gray-300 px-2 py-1.5 text-sm"
        >
          {plans.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </select>
      </label>
      <label className="block">
        <span className="mb-1 block text-xs font-medium text-gray-700">Status</span>
        <select
          value={status}
          onChange={(e) => setStatus(e.target.value)}
          className="rounded-md border border-gray-300 px-2 py-1.5 text-sm"
        >
          {SUBSCRIPTION_STATUS_OPTIONS.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
      </label>
      <button
        type="submit"
        disabled={submitting}
        className="rounded-md bg-purple-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-purple-700 disabled:opacity-50"
      >
        {submitting ? 'Assigning…' : 'Assign'}
      </button>
    </form>
  );
}

// ── Module overrides ─────────────────────────────────────────────────────────

function ModuleOverridesSection({ shopId, modules, overrides }) {
  const queryClient = useQueryClient();
  const overrideMutation = useMutation({
    mutationFn: ({ moduleId, enabled }) => shopsApi.setModuleOverride(shopId, moduleId, enabled),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['shop', shopId] }),
  });

  const overrideByModuleId = Object.fromEntries(overrides.map((o) => [o.moduleId, o]));

  return (
    <div className="rounded-lg border border-gray-200 bg-white p-5">
      <h2 className="mb-1 text-sm font-semibold text-gray-900">Module overrides</h2>
      <p className="mb-3 text-xs text-gray-500">
        Grant or revoke a module for this shop regardless of its plan.
      </p>
      <div className="divide-y divide-gray-100">
        {modules.map((m) => {
          const override = overrideByModuleId[m.id];
          return (
            <div key={m.id} className="flex items-center justify-between py-2 text-sm">
              <span className="text-gray-800">{m.name}</span>
              <div className="flex items-center gap-2">
                <span className="text-xs text-gray-400">
                  {override ? (override.enabled ? 'Override: granted' : 'Override: revoked') : 'Following plan'}
                </span>
                <button
                  onClick={() => overrideMutation.mutate({ moduleId: m.id, enabled: true })}
                  className="rounded-md border border-green-300 px-2 py-1 text-xs text-green-700 hover:bg-green-50"
                >
                  Grant
                </button>
                <button
                  onClick={() => overrideMutation.mutate({ moduleId: m.id, enabled: false })}
                  className="rounded-md border border-red-300 px-2 py-1 text-xs text-red-700 hover:bg-red-50"
                >
                  Revoke
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Shop users ────────────────────────────────────────────────────────────────

function ShopUsersSection({ shopId, modules }) {
  const queryClient = useQueryClient();
  const [showAdd, setShowAdd] = useState(false);

  const usersQuery = useQuery({
    queryKey: ['shopUsers', shopId],
    queryFn: () => shopUsersApi.listShopUsers(shopId),
  });

  const createMutation = useMutation({
    mutationFn: (data) => shopUsersApi.createShopUser(shopId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['shopUsers', shopId] });
      setShowAdd(false);
    },
  });

  const accessMutation = useMutation({
    mutationFn: ({ userId, moduleId, canView, canEdit }) =>
      shopUsersApi.setShopUserAccess(shopId, userId, moduleId, { canView, canEdit }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['shopUsers', shopId] }),
  });

  return (
    <div className="rounded-lg border border-gray-200 bg-white p-5">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-sm font-semibold text-gray-900">Shop users</h2>
        <button
          onClick={() => setShowAdd((v) => !v)}
          className="rounded-md bg-purple-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-purple-700"
        >
          Add user
        </button>
      </div>

      {showAdd && (
        <AddShopUserForm
          onSubmit={(data) => createMutation.mutate(data)}
          submitting={createMutation.isPending}
          error={createMutation.error}
        />
      )}

      <div className="space-y-4">
        {usersQuery.data?.map((user) => (
          <div key={user.id} className="rounded-md border border-gray-100 p-3">
            <div className="mb-2 flex items-center justify-between">
              <span className="text-sm font-medium text-gray-900">
                {user.name} <span className="font-normal text-gray-500">· {user.phone}</span>
              </span>
              <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-600">
                {user.role}
              </span>
            </div>
            <div className="grid grid-cols-2 gap-1">
              {modules.map((m) => {
                const access = user.moduleAccess.find((a) => a.moduleId === m.id);
                return (
                  <div key={m.id} className="flex items-center justify-between text-xs text-gray-600">
                    <span>{m.name}</span>
                    <div className="flex gap-2">
                      <label className="flex items-center gap-1">
                        <input
                          type="checkbox"
                          checked={access?.canView ?? false}
                          onChange={(e) =>
                            accessMutation.mutate({
                              userId: user.id,
                              moduleId: m.id,
                              canView: e.target.checked,
                              canEdit: access?.canEdit ?? false,
                            })
                          }
                        />
                        View
                      </label>
                      <label className="flex items-center gap-1">
                        <input
                          type="checkbox"
                          checked={access?.canEdit ?? false}
                          onChange={(e) =>
                            accessMutation.mutate({
                              userId: user.id,
                              moduleId: m.id,
                              canView: access?.canView ?? false,
                              canEdit: e.target.checked,
                            })
                          }
                        />
                        Edit
                      </label>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
        {usersQuery.data?.length === 0 && (
          <p className="text-sm text-gray-400">No staff added yet.</p>
        )}
      </div>
    </div>
  );
}

function AddShopUserForm({ onSubmit, submitting, error }) {
  const [form, setForm] = useState({ name: '', phone: '', role: 'CASHIER' });

  function handleChange(field) {
    return (e) => setForm((f) => ({ ...f, [field]: e.target.value }));
  }

  function handleSubmit(e) {
    e.preventDefault();
    onSubmit(form);
  }

  return (
    <form onSubmit={handleSubmit} className="mb-4 flex items-end gap-3 rounded-md bg-gray-50 p-3">
      {error && <p className="text-sm text-red-600">{error.message}</p>}
      <Field label="Name" value={form.name} onChange={handleChange('name')} required />
      <Field label="Phone" value={form.phone} onChange={handleChange('phone')} required />
      <label className="block">
        <span className="mb-1 block text-xs font-medium text-gray-700">Role</span>
        <select
          value={form.role}
          onChange={handleChange('role')}
          className="rounded-md border border-gray-300 px-2 py-1.5 text-sm"
        >
          {SHOP_USER_ROLES.map((r) => (
            <option key={r} value={r}>
              {r}
            </option>
          ))}
        </select>
      </label>
      <button
        type="submit"
        disabled={submitting}
        className="rounded-md bg-purple-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-purple-700 disabled:opacity-50"
      >
        {submitting ? 'Adding…' : 'Add'}
      </button>
    </form>
  );
}
