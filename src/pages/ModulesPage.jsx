import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Plus, Pencil } from 'lucide-react';
import * as modulesApi from '../api/modules';
import Modal from '../components/Modal';
import Field from '../components/Field';
import { useToast } from '../components/ToastContext';

export default function ModulesPage() {
  const queryClient = useQueryClient();
  const toast = useToast();
  const [editingModule, setEditingModule] = useState(null);
  const [showForm, setShowForm] = useState(false);

  const { data, isLoading, error } = useQuery({ queryKey: ['modules'], queryFn: modulesApi.listModules });

  const saveMutation = useMutation({
    mutationFn: ({ id, data }) => (id ? modulesApi.updateModule(id, data) : modulesApi.createModule(data)),
    onSuccess: (module_) => {
      queryClient.invalidateQueries({ queryKey: ['modules'] });
      setShowForm(false);
      setEditingModule(null);
      toast.success(`${module_.name} saved`);
    },
    onError: (err) => toast.error(err.message),
  });

  function openCreate() {
    setEditingModule(null);
    setShowForm(true);
  }

  function openEdit(module_) {
    setEditingModule(module_);
    setShowForm(true);
  }

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-gray-900">Modules</h1>
          <p className="mt-0.5 text-sm text-gray-500">
            The catalog of features that can be included in a plan or granted per-shop.
          </p>
        </div>
        <button
          onClick={openCreate}
          className="flex items-center gap-1.5 rounded-md bg-purple-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-purple-700"
        >
          <Plus size={15} />
          New module
        </button>
      </div>

      {isLoading && <p className="text-sm text-gray-500">Loading…</p>}
      {error && <p className="text-sm text-red-600">{error.message}</p>}

      {data && (
        <div className="overflow-hidden rounded-lg border border-gray-200 bg-white">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-gray-200 bg-gray-50 text-xs uppercase text-gray-500">
              <tr>
                <th className="px-4 py-2.5">Name</th>
                <th className="px-4 py-2.5">Key</th>
                <th className="px-4 py-2.5">Description</th>
                <th className="px-4 py-2.5"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {data.map((m) => (
                <tr key={m.id} className="hover:bg-gray-50">
                  <td className="px-4 py-2.5 font-medium text-gray-900">{m.name}</td>
                  <td className="px-4 py-2.5 font-mono text-xs text-gray-500">{m.key}</td>
                  <td className="px-4 py-2.5 text-gray-600">{m.description || '—'}</td>
                  <td className="px-4 py-2.5 text-right">
                    <button
                      onClick={() => openEdit(m)}
                      className="inline-flex items-center gap-1 text-xs text-purple-700 hover:underline"
                    >
                      <Pencil size={12} /> Edit
                    </button>
                  </td>
                </tr>
              ))}
              {data.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-4 py-8 text-center text-gray-400">
                    No modules yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {showForm && (
        <ModuleFormModal
          module={editingModule}
          onClose={() => setShowForm(false)}
          onSubmit={(data) => saveMutation.mutate({ id: editingModule?.id, data })}
          submitting={saveMutation.isPending}
          error={saveMutation.error}
        />
      )}
    </div>
  );
}

function ModuleFormModal({ module: mod, onClose, onSubmit, submitting, error }) {
  const [key, setKey] = useState(mod?.key ?? '');
  const [name, setName] = useState(mod?.name ?? '');
  const [description, setDescription] = useState(mod?.description ?? '');

  function handleSubmit(e) {
    e.preventDefault();
    // key is set once at creation and never sent on update — it's the
    // stable identifier plans/overrides/module-access all reference by,
    // changing it after the fact would silently detach those.
    onSubmit(mod ? { name, description: description || null } : { key, name, description: description || undefined });
  }

  return (
    <Modal title={mod ? 'Edit module' : 'New module'} onClose={onClose}>
      <form onSubmit={handleSubmit} className="space-y-3">
        {error && (
          <div className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{error.message}</div>
        )}
        {!mod && (
          <Field
            label="Key"
            value={key}
            onChange={(e) => setKey(e.target.value)}
            placeholder="e.g. ai_manager"
            required
          />
        )}
        <Field label="Name" value={name} onChange={(e) => setName(e.target.value)} required />
        <Field label="Description" value={description} onChange={(e) => setDescription(e.target.value)} />
        <button
          type="submit"
          disabled={submitting}
          className="w-full rounded-md bg-purple-600 px-4 py-2 text-sm font-medium text-white hover:bg-purple-700 disabled:opacity-50"
        >
          {submitting ? 'Saving…' : mod ? 'Save changes' : 'Create module'}
        </button>
      </form>
    </Modal>
  );
}
