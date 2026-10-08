import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Plus } from 'lucide-react';
import * as plansApi from '../api/plans';
import * as modulesApi from '../api/modules';
import Modal from '../components/Modal';
import Field from '../components/Field';
import ModuleCheckboxGrid from '../components/ModuleCheckboxGrid';
import ConfirmDialog from '../components/ConfirmDialog';
import { useToast } from '../components/ToastContext';

const BILLING_CYCLES = ['MONTHLY', 'YEARLY'];

export default function PlansPage() {
  const queryClient = useQueryClient();
  const toast = useToast();
  const [editingPlan, setEditingPlan] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [deactivatingPlan, setDeactivatingPlan] = useState(null);
  const [deletingPlan, setDeletingPlan] = useState(null);
  // Retired plans (Free, Advanced) stay in the database for billing
  // history but default to hidden here — otherwise every retired tier
  // clutters the page forever alongside the two actually-offered plans.
  const [showInactive, setShowInactive] = useState(false);

  const plansQuery = useQuery({ queryKey: ['plans'], queryFn: plansApi.listPlans });
  const modulesQuery = useQuery({ queryKey: ['modules'], queryFn: modulesApi.listModules });

  const saveMutation = useMutation({
    mutationFn: ({ id, data }) =>
      id ? plansApi.updatePlan(id, data) : plansApi.createPlan(data),
    onSuccess: (plan) => {
      queryClient.invalidateQueries({ queryKey: ['plans'] });
      setShowForm(false);
      setEditingPlan(null);
      toast.success(`${plan.name} saved`);
    },
    onError: (err) => toast.error(err.message),
  });

  const deactivateMutation = useMutation({
    mutationFn: plansApi.deletePlan,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['plans'] });
      toast.success(`${deactivatingPlan?.name} deactivated`);
      setDeactivatingPlan(null);
    },
    onError: (err) => toast.error(err.message),
  });

  const deletePermanentlyMutation = useMutation({
    mutationFn: plansApi.deletePlanPermanently,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['plans'] });
      toast.success(`${deletingPlan?.name} permanently deleted`);
      setDeletingPlan(null);
    },
    // Most likely a 409 from the backend's reference check — show the
    // exact count it gives rather than a generic failure.
    onError: (err) => toast.error(err.message),
  });

  function openCreate() {
    setEditingPlan(null);
    setShowForm(true);
  }

  function openEdit(plan) {
    setEditingPlan(plan);
    setShowForm(true);
  }

  const inactiveCount = plansQuery.data?.filter((p) => !p.isActive).length ?? 0;
  const visiblePlans = plansQuery.data?.filter((p) => showInactive || p.isActive) ?? [];

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-xl font-semibold text-gray-900">Plans</h1>
        <div className="flex items-center gap-4">
          {inactiveCount > 0 && (
            <label className="flex items-center gap-1.5 text-sm text-gray-600">
              <input
                type="checkbox"
                checked={showInactive}
                onChange={(e) => setShowInactive(e.target.checked)}
              />
              Show inactive ({inactiveCount})
            </label>
          )}
          <button
            onClick={openCreate}
            className="flex items-center gap-1.5 rounded-md bg-purple-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-purple-700"
          >
            <Plus size={15} />
            New plan
          </button>
        </div>
      </div>

      {plansQuery.isLoading && <p className="text-sm text-gray-500">Loading…</p>}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {visiblePlans.map((plan) => (
          <div key={plan.id} className="rounded-lg border border-gray-200 bg-white p-5">
            <div className="mb-2 flex items-start justify-between">
              <div>
                <h2 className="text-base font-semibold text-gray-900">{plan.name}</h2>
                <p className="text-sm text-gray-500">
                  ₹{plan.price} / {plan.billingCycle.toLowerCase()}
                </p>
              </div>
              {!plan.isActive && (
                <span className="rounded-full bg-gray-200 px-2 py-0.5 text-xs text-gray-600">
                  inactive
                </span>
              )}
            </div>
            <div className="mb-3 flex flex-wrap gap-1">
              {plan.modules.map((pm) => (
                <span
                  key={pm.id}
                  className="rounded-full bg-purple-50 px-2 py-0.5 text-xs text-purple-700"
                >
                  {pm.module.name}
                </span>
              ))}
            </div>
            <div className="mb-4 space-y-0.5 text-xs text-gray-500">
              <p>Invoices: {plan.invoiceMonthlyLimit == null ? 'Unlimited' : `${plan.invoiceMonthlyLimit}/month`}</p>
              <p>Staff: {plan.staffLimit == null ? 'Unlimited' : `${plan.staffLimit} additional`}</p>
            </div>
            <div className="flex gap-3 text-sm">
              <button onClick={() => openEdit(plan)} className="text-purple-700 hover:underline">
                Edit
              </button>
              {plan.isActive ? (
                <button
                  onClick={() => setDeactivatingPlan(plan)}
                  className="text-red-600 hover:underline"
                >
                  Deactivate
                </button>
              ) : (
                <button
                  onClick={() => setDeletingPlan(plan)}
                  className="text-red-600 hover:underline"
                >
                  Delete permanently
                </button>
              )}
            </div>
          </div>
        ))}
      </div>

      {showForm && modulesQuery.data && (
        <PlanFormModal
          plan={editingPlan}
          modules={modulesQuery.data}
          onClose={() => setShowForm(false)}
          onSubmit={(data) => saveMutation.mutate({ id: editingPlan?.id, data })}
          submitting={saveMutation.isPending}
          error={saveMutation.error}
        />
      )}

      {deactivatingPlan && (
        <ConfirmDialog
          title="Deactivate this plan?"
          message={`${deactivatingPlan.name} will no longer be offered to new subscribers. Shops already on it keep their access until you change it.`}
          confirmLabel="Deactivate"
          tone="danger"
          busy={deactivateMutation.isPending}
          onConfirm={() => deactivateMutation.mutate(deactivatingPlan.id)}
          onClose={() => setDeactivatingPlan(null)}
        />
      )}

      {deletingPlan && (
        <ConfirmDialog
          title="Permanently delete this plan?"
          message={`${deletingPlan.name} will be removed completely — this cannot be undone. Only possible when no shop's subscription or payment claim still references it; you'll see exactly what's blocking it otherwise.`}
          confirmLabel="Delete permanently"
          tone="danger"
          busy={deletePermanentlyMutation.isPending}
          onConfirm={() => deletePermanentlyMutation.mutate(deletingPlan.id)}
          onClose={() => setDeletingPlan(null)}
        />
      )}
    </div>
  );
}

function PlanFormModal({ plan, modules, onClose, onSubmit, submitting, error }) {
  const [name, setName] = useState(plan?.name ?? '');
  const [price, setPrice] = useState(plan?.price ?? 0);
  const [billingCycle, setBillingCycle] = useState(plan?.billingCycle ?? 'MONTHLY');
  const [moduleIds, setModuleIds] = useState(plan?.modules.map((pm) => pm.moduleId) ?? []);
  // Empty string = unlimited (sent as null) — distinct from 0, which is a
  // real, meaningful cap (e.g. staffLimit: 0 means no additional staff at
  // all). Defaults to empty/unlimited for a brand-new plan rather than
  // guessing a number. invoiceMonthlyLimit counts voice- and
  // manually-created invoices TOGETHER against one combined monthly quota
  // (previously two separate fields — a lifetime voice cap and a monthly
  // manual cap — now collapsed into this one, matching the simplified
  // business rule).
  const [invoiceMonthlyLimit, setInvoiceMonthlyLimit] = useState(plan?.invoiceMonthlyLimit ?? '');
  const [staffLimit, setStaffLimit] = useState(plan?.staffLimit ?? '');

  function handleSubmit(e) {
    e.preventDefault();
    onSubmit({
      name,
      price: Number(price),
      billingCycle,
      moduleIds,
      invoiceMonthlyLimit: invoiceMonthlyLimit === '' ? null : Number(invoiceMonthlyLimit),
      staffLimit: staffLimit === '' ? null : Number(staffLimit),
    });
  }

  return (
    <Modal title={plan ? 'Edit plan' : 'New plan'} onClose={onClose}>
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{error.message}</div>
        )}
        <Field label="Name" value={name} onChange={(e) => setName(e.target.value)} required />
        <Field
          label="Price (INR)"
          type="number"
          min="0"
          step="0.01"
          value={price}
          onChange={(e) => setPrice(e.target.value)}
          required
        />
        <label className="block">
          <span className="mb-1 block text-sm font-medium text-gray-700">Billing cycle</span>
          <select
            value={billingCycle}
            onChange={(e) => setBillingCycle(e.target.value)}
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
          >
            {BILLING_CYCLES.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </label>
        <div>
          <span className="mb-1 block text-sm font-medium text-gray-700">Included modules</span>
          <ModuleCheckboxGrid modules={modules} selectedIds={moduleIds} onChange={setModuleIds} />
        </div>
        <div>
          <span className="mb-1 block text-sm font-medium text-gray-700">Resource limits</span>
          <p className="mb-2 text-xs text-gray-500">Leave a field blank for unlimited.</p>
          <div className="grid grid-cols-2 gap-3">
            <Field
              label="Invoices / month"
              type="number"
              min="0"
              placeholder="Unlimited"
              value={invoiceMonthlyLimit}
              onChange={(e) => setInvoiceMonthlyLimit(e.target.value)}
            />
            <Field
              label="Staff (additional)"
              type="number"
              min="0"
              placeholder="Unlimited"
              value={staffLimit}
              onChange={(e) => setStaffLimit(e.target.value)}
            />
          </div>
        </div>
        <button
          type="submit"
          disabled={submitting}
          className="w-full rounded-md bg-purple-600 px-4 py-2 text-sm font-medium text-white hover:bg-purple-700 disabled:opacity-50"
        >
          {submitting ? 'Saving…' : plan ? 'Save changes' : 'Create plan'}
        </button>
      </form>
    </Modal>
  );
}
