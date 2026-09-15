import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import * as plansApi from '../api/plans';
import * as modulesApi from '../api/modules';
import Modal from '../components/Modal';
import Field from '../components/Field';
import ModuleCheckboxGrid from '../components/ModuleCheckboxGrid';

const BILLING_CYCLES = ['MONTHLY', 'YEARLY'];

export default function PlansPage() {
  const queryClient = useQueryClient();
  const [editingPlan, setEditingPlan] = useState(null);
  const [showForm, setShowForm] = useState(false);

  const plansQuery = useQuery({ queryKey: ['plans'], queryFn: plansApi.listPlans });
  const modulesQuery = useQuery({ queryKey: ['modules'], queryFn: modulesApi.listModules });

  const saveMutation = useMutation({
    mutationFn: ({ id, data }) =>
      id ? plansApi.updatePlan(id, data) : plansApi.createPlan(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['plans'] });
      setShowForm(false);
      setEditingPlan(null);
    },
  });

  const deactivateMutation = useMutation({
    mutationFn: plansApi.deletePlan,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['plans'] }),
  });

  function openCreate() {
    setEditingPlan(null);
    setShowForm(true);
  }

  function openEdit(plan) {
    setEditingPlan(plan);
    setShowForm(true);
  }

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-xl font-semibold text-gray-900">Plans</h1>
        <button
          onClick={openCreate}
          className="rounded-md bg-purple-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-purple-700"
        >
          New plan
        </button>
      </div>

      {plansQuery.isLoading && <p className="text-sm text-gray-500">Loading…</p>}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {plansQuery.data?.map((plan) => (
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
            <div className="mb-4 flex flex-wrap gap-1">
              {plan.modules.map((pm) => (
                <span
                  key={pm.id}
                  className="rounded-full bg-purple-50 px-2 py-0.5 text-xs text-purple-700"
                >
                  {pm.module.name}
                </span>
              ))}
            </div>
            <div className="flex gap-3 text-sm">
              <button onClick={() => openEdit(plan)} className="text-purple-700 hover:underline">
                Edit
              </button>
              {plan.isActive && (
                <button
                  onClick={() => deactivateMutation.mutate(plan.id)}
                  className="text-red-600 hover:underline"
                >
                  Deactivate
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
    </div>
  );
}

function PlanFormModal({ plan, modules, onClose, onSubmit, submitting, error }) {
  const [name, setName] = useState(plan?.name ?? '');
  const [price, setPrice] = useState(plan?.price ?? 0);
  const [billingCycle, setBillingCycle] = useState(plan?.billingCycle ?? 'MONTHLY');
  const [moduleIds, setModuleIds] = useState(plan?.modules.map((pm) => pm.moduleId) ?? []);

  function handleSubmit(e) {
    e.preventDefault();
    onSubmit({ name, price: Number(price), billingCycle, moduleIds });
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
