import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { Store, Users, IndianRupee, Clock, TrendingUp, ArrowUpRight } from 'lucide-react';
import * as dashboardApi from '../api/dashboard';
import StatCard from '../components/StatCard';
import StatusBadge from '../components/StatusBadge';

const PLAN_BAR_COLORS = ['bg-purple-500', 'bg-blue-500', 'bg-emerald-500', 'bg-amber-500', 'bg-gray-400'];

export default function DashboardPage() {
  const { data, isLoading, error } = useQuery({
    queryKey: ['dashboard-summary'],
    queryFn: dashboardApi.getDashboardSummary,
  });

  if (isLoading) return <p className="text-sm text-gray-500">Loading…</p>;
  if (error) return <p className="text-sm text-red-600">{error.message}</p>;

  const { shops, plans, revenue, moduleCount, recentShops } = data;
  const maxPlanCount = Math.max(1, ...Object.values(plans.distribution));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-gray-900">Dashboard</h1>
        <p className="mt-0.5 text-sm text-gray-500">An overview of every shop on VAANI.</p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          icon={Store}
          label="Total shops"
          value={shops.total}
          sub={`+${shops.newLast7Days} in the last 7 days`}
          tint="purple"
        />
        <StatCard
          icon={Users}
          label="Active shops"
          value={shops.byStatus.ACTIVE}
          sub={`${shops.byStatus.TRIAL} on trial`}
          tint="blue"
        />
        <StatCard
          icon={IndianRupee}
          label="Confirmed revenue"
          value={`₹${revenue.confirmedTotal.toLocaleString('en-IN')}`}
          sub={`₹${revenue.confirmedThisMonth.toLocaleString('en-IN')} this month`}
          tint="green"
        />
        <StatCard
          icon={Clock}
          label="Pending payment claims"
          value={revenue.pendingCount}
          sub={revenue.pendingCount > 0 ? `₹${revenue.pendingTotal.toLocaleString('en-IN')} awaiting review` : 'All caught up'}
          tint="amber"
        />
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="rounded-lg border border-gray-200 bg-white p-5 lg:col-span-1">
          <h2 className="mb-4 text-sm font-semibold text-gray-900">Shops by status</h2>
          <div className="space-y-3">
            {Object.entries(shops.byStatus).map(([status, count]) => (
              <div key={status} className="flex items-center justify-between">
                <StatusBadge status={status} />
                <span className="text-sm font-medium text-gray-700">{count}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-lg border border-gray-200 bg-white p-5 lg:col-span-2">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-gray-900">Plan distribution</h2>
            <span className="flex items-center gap-1 text-xs text-gray-400">
              <TrendingUp size={12} /> {plans.activeCatalogCount} active plans · {moduleCount} modules
            </span>
          </div>
          <div className="space-y-3">
            {Object.entries(plans.distribution).map(([name, count], i) => (
              <div key={name}>
                <div className="mb-1 flex items-center justify-between text-sm">
                  <span className="font-medium text-gray-700">{name}</span>
                  <span className="text-gray-500">{count} shop{count === 1 ? '' : 's'}</span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-gray-100">
                  <div
                    className={`h-full rounded-full ${PLAN_BAR_COLORS[i % PLAN_BAR_COLORS.length]}`}
                    style={{ width: `${(count / maxPlanCount) * 100}%` }}
                  />
                </div>
              </div>
            ))}
            {Object.keys(plans.distribution).length === 0 && (
              <p className="text-sm text-gray-400">No shops yet.</p>
            )}
          </div>
        </div>
      </div>

      <div className="rounded-lg border border-gray-200 bg-white p-5">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-gray-900">Recent signups</h2>
          <Link to="/shops" className="flex items-center gap-0.5 text-xs font-medium text-purple-700 hover:underline">
            View all shops <ArrowUpRight size={12} />
          </Link>
        </div>
        <div className="divide-y divide-gray-100">
          {recentShops.map((shop) => (
            <Link
              key={shop.id}
              to={`/shops/${shop.id}`}
              className="flex items-center justify-between py-2.5 text-sm hover:bg-gray-50"
            >
              <div>
                <span className="font-medium text-gray-900">{shop.name}</span>{' '}
                <span className="text-gray-500">
                  · {shop.ownerName} · {shop.phone}
                </span>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-xs text-gray-400">
                  {new Date(shop.createdAt).toLocaleDateString()}
                </span>
                <StatusBadge status={shop.status} />
              </div>
            </Link>
          ))}
          {recentShops.length === 0 && <p className="py-2 text-sm text-gray-400">No shops yet.</p>}
        </div>
      </div>
    </div>
  );
}
