import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Plus, Pencil } from 'lucide-react';
import * as shopsApi from '../../api/shops';
import * as plansApi from '../../api/plans';
import * as subscriptionsApi from '../../api/subscriptions';
import * as shopUsersApi from '../../api/shopUsers';
import StatusBadge from '../../components/StatusBadge';
import Field from '../../components/Field';
import Select from '../../components/Select';
import Modal from '../../components/Modal';
import { useToast } from '../../components/ToastContext';

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

function dateInputValue(d) {
  return d ? new Date(d).toISOString().slice(0, 10) : '';
}

function SubscriptionsSection({ shopId }) {
  const queryClient = useQueryClient();
  const toast = useToast();
  const [showAssign, setShowAssign] = useState(false);
  const [editingSub, setEditingSub] = useState(null);

  const subsQuery = useQuery({
    queryKey: ['subscriptions', shopId],
    queryFn: () => subscriptionsApi.listSubscriptionsForShop(shopId),
  });
  const plansQuery = useQuery({ queryKey: ['plans'], queryFn: plansApi.listPlans });

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ['subscriptions', shopId] });
    queryClient.invalidateQueries({ queryKey: ['shop', shopId] });
    queryClient.invalidateQueries({ queryKey: ['shops'] });
  };

  const createMutation = useMutation({
    mutationFn: subscriptionsApi.createSubscription,
    onSuccess: () => {
      invalidate();
      setShowAssign(false);
      toast.success('Subscription assigned');
    },
    onError: (err) => toast.error(err.message),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => subscriptionsApi.updateSubscription(id, data),
    onSuccess: () => {
      invalidate();
      setEditingSub(null);
      toast.success('Subscription updated');
    },
    onError: (err) => toast.error(err.message),
  });

  return (
    <div className="rounded-lg border border-gray-200 bg-white p-5">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-sm font-semibold text-gray-900">Subscriptions</h2>
        <button
          onClick={() => setShowAssign((v) => !v)}
          className="flex items-center gap-1 rounded-md bg-purple-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-purple-700"
        >
          <Plus size={13} />
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
                {sub.autoRenew ? ' · auto-renews' : ''}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <StatusBadge status={sub.status} />
              <button
                onClick={() => setEditingSub(sub)}
                title="Edit subscription"
                className="rounded-md p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
              >
                <Pencil size={13} />
              </button>
            </div>
          </div>
        ))}
        {subsQuery.data?.length === 0 && (
          <p className="py-2 text-sm text-gray-400">No subscriptions yet — this shop is on the free Basic plan.</p>
        )}
      </div>

      {editingSub && plansQuery.data && (
        <EditSubscriptionModal
          subscription={editingSub}
          plans={plansQuery.data}
          onClose={() => setEditingSub(null)}
          onSubmit={(data) => updateMutation.mutate({ id: editingSub.id, data })}
          submitting={updateMutation.isPending}
          error={updateMutation.error}
        />
      )}
    </div>
  );
}

function AssignSubscriptionForm({ shopId, plans, onSubmit, submitting, error }) {
  const [planId, setPlanId] = useState(plans[0]?.id ?? '');
  const [status, setStatus] = useState('ACTIVE');
  const [endDate, setEndDate] = useState('');

  function handleSubmit(e) {
    e.preventDefault();
    onSubmit({ shopId, planId, status, endDate: endDate || undefined });
  }

  return (
    <form onSubmit={handleSubmit} className="mb-4 flex flex-wrap items-end gap-3 rounded-md bg-gray-50 p-3">
      {error && <p className="w-full text-sm text-red-600">{error.message}</p>}
      <Select label="Plan" value={planId} onChange={(e) => setPlanId(e.target.value)}>
        {plans.map((p) => (
          <option key={p.id} value={p.id}>
            {p.name} · ₹{p.price}
          </option>
        ))}
      </Select>
      <Select label="Status" value={status} onChange={(e) => setStatus(e.target.value)}>
        {SUBSCRIPTION_STATUS_OPTIONS.map((s) => (
          <option key={s} value={s}>
            {s}
          </option>
        ))}
      </Select>
      <Field
        label="Ends (optional)"
        type="date"
        value={endDate}
        onChange={(e) => setEndDate(e.target.value)}
      />
      <button
        type="submit"
        disabled={submitting}
        className="rounded-md bg-purple-600 px-3 py-2 text-sm font-medium text-white hover:bg-purple-700 disabled:opacity-50"
      >
        {submitting ? 'Assigning…' : 'Assign'}
      </button>
    </form>
  );
}

function EditSubscriptionModal({ subscription, plans, onClose, onSubmit, submitting, error }) {
  const [planId, setPlanId] = useState(subscription.planId);
  const [status, setStatus] = useState(subscription.status);
  const [startDate, setStartDate] = useState(dateInputValue(subscription.startDate));
  const [endDate, setEndDate] = useState(dateInputValue(subscription.endDate));
  const [autoRenew, setAutoRenew] = useState(subscription.autoRenew ?? false);

  function handleSubmit(e) {
    e.preventDefault();
    onSubmit({
      planId,
      status,
      startDate: startDate || undefined,
      endDate: endDate || null,
      autoRenew,
    });
  }

  return (
    <Modal title={`Edit ${subscription.plan.name} subscription`} onClose={onClose}>
      <form onSubmit={handleSubmit} className="space-y-3">
        {error && (
          <div className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{error.message}</div>
        )}
        <Select label="Plan" value={planId} onChange={(e) => setPlanId(e.target.value)}>
          {plans.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name} · ₹{p.price}
            </option>
          ))}
        </Select>
        <Select label="Status" value={status} onChange={(e) => setStatus(e.target.value)}>
          {SUBSCRIPTION_STATUS_OPTIONS.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </Select>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Start date" type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
          <Field label="End date" type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
        </div>
        <label className="flex items-center gap-2 text-sm text-gray-700">
          <input
            type="checkbox"
            checked={autoRenew}
            onChange={(e) => setAutoRenew(e.target.checked)}
            className="h-4 w-4 rounded border-gray-300 text-purple-600 focus:ring-purple-500"
          />
          Auto-renew
        </label>
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

// ── Module overrides ─────────────────────────────────────────────────────────

function ModuleOverridesSection({ shopId, modules, overrides }) {
  const queryClient = useQueryClient();
  const toast = useToast();
  const overrideMutation = useMutation({
    mutationFn: ({ moduleId, enabled }) =>
      enabled === null
        ? shopsApi.removeModuleOverride(shopId, moduleId)
        : shopsApi.setModuleOverride(shopId, moduleId, enabled),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['shop', shopId] }),
    onError: (err) => toast.error(err.message),
  });

  const overrideByModuleId = Object.fromEntries(overrides.map((o) => [o.moduleId, o]));

  return (
    <div className="rounded-lg border border-gray-200 bg-white p-5">
      <h2 className="mb-1 text-sm font-semibold text-gray-900">Module overrides</h2>
      <p className="mb-3 text-xs text-gray-500">
        Grant or revoke a module for this shop regardless of its plan. "Following plan" means the shop's plan decides.
      </p>
      <div className="divide-y divide-gray-100">
        {modules.map((m) => {
          const override = overrideByModuleId[m.id];
          const state = override ? (override.enabled ? 'granted' : 'revoked') : 'plan';
          return (
            <div key={m.id} className="flex items-center justify-between py-2.5 text-sm">
              <span className="text-gray-800">{m.name}</span>
              <div className="flex items-center gap-1 rounded-md border border-gray-200 p-0.5">
                <OverrideOption
                  active={state === 'granted'}
                  label="Grant"
                  activeClasses="bg-emerald-100 text-emerald-700"
                  onClick={() => overrideMutation.mutate({ moduleId: m.id, enabled: true })}
                />
                <OverrideOption
                  active={state === 'plan'}
                  label="Follow plan"
                  activeClasses="bg-gray-200 text-gray-700"
                  onClick={() => overrideMutation.mutate({ moduleId: m.id, enabled: null })}
                />
                <OverrideOption
                  active={state === 'revoked'}
                  label="Revoke"
                  activeClasses="bg-red-100 text-red-700"
                  onClick={() => overrideMutation.mutate({ moduleId: m.id, enabled: false })}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function OverrideOption({ active, label, activeClasses, onClick }) {
  return (
    <button
      onClick={onClick}
      className={`rounded px-2 py-1 text-xs font-medium transition-colors ${
        active ? activeClasses : 'text-gray-400 hover:bg-gray-50'
      }`}
    >
      {label}
    </button>
  );
}

// ── Shop users ────────────────────────────────────────────────────────────────

function ShopUsersSection({ shopId, modules }) {
  const queryClient = useQueryClient();
  const toast = useToast();
  const [showAdd, setShowAdd] = useState(false);
  const [editingUser, setEditingUser] = useState(null);

  const usersQuery = useQuery({
    queryKey: ['shopUsers', shopId],
    queryFn: () => shopUsersApi.listShopUsers(shopId),
  });

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['shopUsers', shopId] });

  const createMutation = useMutation({
    mutationFn: (data) => shopUsersApi.createShopUser(shopId, data),
    onSuccess: () => {
      invalidate();
      setShowAdd(false);
      toast.success('Staff member added');
    },
    onError: (err) => toast.error(err.message),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => shopUsersApi.updateShopUser(shopId, id, data),
    onSuccess: () => {
      invalidate();
      setEditingUser(null);
      toast.success('Staff member updated');
    },
    onError: (err) => toast.error(err.message),
  });

  const accessMutation = useMutation({
    mutationFn: ({ userId, moduleId, canView, canEdit }) =>
      shopUsersApi.setShopUserAccess(shopId, userId, moduleId, { canView, canEdit }),
    onSuccess: invalidate,
    onError: (err) => toast.error(err.message),
  });

  return (
    <div className="rounded-lg border border-gray-200 bg-white p-5">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-sm font-semibold text-gray-900">Shop users</h2>
        <button
          onClick={() => setShowAdd((v) => !v)}
          className="flex items-center gap-1 rounded-md bg-purple-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-purple-700"
        >
          <Plus size={13} />
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
              <div className="flex items-center gap-2">
                <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-600">
                  {user.role}
                </span>
                <button
                  onClick={() => setEditingUser(user)}
                  title="Edit staff member"
                  className="rounded-md p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
                >
                  <Pencil size={13} />
                </button>
              </div>
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

      {editingUser && (
        <EditShopUserModal
          user={editingUser}
          onClose={() => setEditingUser(null)}
          onSubmit={(data) => updateMutation.mutate({ id: editingUser.id, data })}
          submitting={updateMutation.isPending}
          error={updateMutation.error}
        />
      )}
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
    <form onSubmit={handleSubmit} className="mb-4 flex flex-wrap items-end gap-3 rounded-md bg-gray-50 p-3">
      {error && <p className="w-full text-sm text-red-600">{error.message}</p>}
      <Field label="Name" value={form.name} onChange={handleChange('name')} required />
      <Field label="Phone" value={form.phone} onChange={handleChange('phone')} required />
      <Select label="Role" value={form.role} onChange={handleChange('role')}>
        {SHOP_USER_ROLES.map((r) => (
          <option key={r} value={r}>
            {r}
          </option>
        ))}
      </Select>
      <button
        type="submit"
        disabled={submitting}
        className="rounded-md bg-purple-600 px-3 py-2 text-sm font-medium text-white hover:bg-purple-700 disabled:opacity-50"
      >
        {submitting ? 'Adding…' : 'Add'}
      </button>
    </form>
  );
}

function EditShopUserModal({ user, onClose, onSubmit, submitting, error }) {
  const [form, setForm] = useState({ name: user.name, phone: user.phone, role: user.role });

  function handleChange(field) {
    return (e) => setForm((f) => ({ ...f, [field]: e.target.value }));
  }

  function handleSubmit(e) {
    e.preventDefault();
    onSubmit(form);
  }

  return (
    <Modal title="Edit staff member" onClose={onClose}>
      <form onSubmit={handleSubmit} className="space-y-3">
        {error && (
          <div className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{error.message}</div>
        )}
        <Field label="Name" value={form.name} onChange={handleChange('name')} required />
        <Field label="Phone" value={form.phone} onChange={handleChange('phone')} required />
        <Select label="Role" value={form.role} onChange={handleChange('role')}>
          {SHOP_USER_ROLES.map((r) => (
            <option key={r} value={r}>
              {r}
            </option>
          ))}
        </Select>
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
