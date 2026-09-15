const COLORS = {
  TRIAL: 'bg-amber-100 text-amber-700',
  ACTIVE: 'bg-green-100 text-green-700',
  SUSPENDED: 'bg-orange-100 text-orange-700',
  CANCELLED: 'bg-gray-200 text-gray-600',
  EXPIRED: 'bg-red-100 text-red-700',
};

export default function StatusBadge({ status }) {
  const classes = COLORS[status] || 'bg-gray-100 text-gray-600';
  return (
    <span className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-medium ${classes}`}>
      {status}
    </span>
  );
}
