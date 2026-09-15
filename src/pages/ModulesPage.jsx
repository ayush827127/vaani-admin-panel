import { useQuery } from '@tanstack/react-query';
import * as modulesApi from '../api/modules';

export default function ModulesPage() {
  const { data, isLoading, error } = useQuery({ queryKey: ['modules'], queryFn: modulesApi.listModules });

  return (
    <div>
      <h1 className="mb-6 text-xl font-semibold text-gray-900">Modules</h1>
      <p className="mb-4 text-sm text-gray-500">
        The catalog of features that can be included in a plan or granted per-shop.
      </p>

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
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {data.map((m) => (
                <tr key={m.id}>
                  <td className="px-4 py-2.5 font-medium text-gray-900">{m.name}</td>
                  <td className="px-4 py-2.5 font-mono text-xs text-gray-500">{m.key}</td>
                  <td className="px-4 py-2.5 text-gray-600">{m.description}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
