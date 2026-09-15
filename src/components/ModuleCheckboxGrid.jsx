export default function ModuleCheckboxGrid({ modules, selectedIds, onChange }) {
  function toggle(id) {
    if (selectedIds.includes(id)) {
      onChange(selectedIds.filter((x) => x !== id));
    } else {
      onChange([...selectedIds, id]);
    }
  }

  return (
    <div className="grid grid-cols-2 gap-2">
      {modules.map((m) => (
        <label
          key={m.id}
          className="flex items-center gap-2 rounded-md border border-gray-200 px-3 py-2 text-sm"
        >
          <input
            type="checkbox"
            checked={selectedIds.includes(m.id)}
            onChange={() => toggle(m.id)}
            className="h-4 w-4 rounded border-gray-300 text-purple-600 focus:ring-purple-500"
          />
          {m.name}
        </label>
      ))}
    </div>
  );
}
