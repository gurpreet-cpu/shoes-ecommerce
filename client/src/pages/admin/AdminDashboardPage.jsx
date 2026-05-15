import { useRef } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useInView } from 'framer-motion';
import CountUp from 'react-countup';
import {
  AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, CartesianGrid,
} from 'recharts';
import { IndianRupee, ShoppingCart, Users, TrendingUp, Eye, ArrowUpRight } from 'lucide-react';
import api from '../../lib/axios';
import { formatPrice, formatDate, cn } from '../../lib/utils';

// ── Status config ─────────────────────────────────────────────────────────────

const STATUS_DISPLAY = {
  pending:          { label: 'Pending',         badge: 'bg-amber-50 text-amber-700 border-amber-200',    chart: '#f59e0b' },
  confirmed:        { label: 'Confirmed',        badge: 'bg-blue-50 text-blue-700 border-blue-200',       chart: '#3b82f6' },
  processing:       { label: 'Processing',       badge: 'bg-violet-50 text-violet-700 border-violet-200', chart: '#7c3aed' },
  shipped:          { label: 'Shipped',          badge: 'bg-sky-50 text-sky-700 border-sky-200',          chart: '#0ea5e9' },
  out_for_delivery: { label: 'Out for Delivery', badge: 'bg-orange-50 text-orange-700 border-orange-200', chart: '#f97316' },
  delivered:        { label: 'Delivered',        badge: 'bg-emerald-50 text-emerald-700 border-emerald-200', chart: '#10b981' },
  cancelled:        { label: 'Cancelled',        badge: 'bg-red-50 text-red-700 border-red-200',          chart: '#ef4444' },
};

// ── Stat card ──────────────────────────────────────────────────────────────────

function StatCard({ label, value, icon: Icon, trend, isCurrency, delay = 0 }) {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true });

  return (
    <div ref={ref} className="bg-surface border border-border rounded-2xl p-5 flex flex-col gap-3">
      <div className="flex items-start justify-between">
        <p className="font-body text-[11px] font-semibold text-textMuted uppercase tracking-widest">{label}</p>
        <div className="w-9 h-9 rounded-xl bg-accent/10 flex items-center justify-center shrink-0">
          <Icon size={17} className="text-accent" strokeWidth={1.8} />
        </div>
      </div>
      <p className="font-display text-3xl font-bold text-textPrimary leading-none">
        {isCurrency && <span className="text-xl text-textSecondary mr-0.5 font-body font-semibold">₹</span>}
        {isInView ? (
          <CountUp end={isCurrency ? Math.round(value) : value} duration={1.8} separator="," useEasing />
        ) : '0'}
      </p>
      {trend !== undefined && (
        <div className="flex items-center gap-1 font-body text-xs text-accent3">
          <ArrowUpRight size={12} strokeWidth={2.5} />
          <span>+{trend}% this month</span>
        </div>
      )}
    </div>
  );
}

// ── Revenue chart ──────────────────────────────────────────────────────────────

function RevenueChart() {
  const { data, isLoading } = useQuery({
    queryKey: ['admin-revenue-chart'],
    queryFn: () => api.get('/admin/analytics/revenue?period=day').then((r) => r.data.data),
    staleTime: 300_000,
  });

  const chartData = (data?.data || []).map((d) => ({ date: d.date.slice(8), revenue: d.revenue }));

  if (isLoading) return <div className="h-52 flex items-center justify-center font-body text-xs text-textMuted">Loading…</div>;
  if (!chartData.length) return <div className="h-52 flex items-center justify-center font-body text-xs text-textMuted">No revenue data yet</div>;

  return (
    <ResponsiveContainer width="100%" height={208}>
      <AreaChart data={chartData} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
        <defs>
          <linearGradient id="revGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#ff6b35" stopOpacity={0.22} />
            <stop offset="95%" stopColor="#ff6b35" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="#e0ddd8" vertical={false} />
        <XAxis dataKey="date" tick={{ fontSize: 10, fill: '#9E9891', fontFamily: 'JetBrains Mono' }} axisLine={false} tickLine={false} />
        <YAxis tickFormatter={(v) => v >= 1000 ? `₹${(v/1000).toFixed(0)}k` : `₹${v}`} tick={{ fontSize: 10, fill: '#9E9891', fontFamily: 'JetBrains Mono' }} axisLine={false} tickLine={false} width={50} />
        <Tooltip
          formatter={(v) => [formatPrice(v), 'Revenue']}
          contentStyle={{ background: '#f5f4f0', border: '1px solid #e0ddd8', borderRadius: 10, fontFamily: 'Satoshi', fontSize: 11 }}
        />
        <Area type="monotone" dataKey="revenue" stroke="#ff6b35" strokeWidth={2.5} fill="url(#revGrad)" dot={false} activeDot={{ r: 4, fill: '#ff6b35' }} />
      </AreaChart>
    </ResponsiveContainer>
  );
}

// ── Order status donut ─────────────────────────────────────────────────────────

function OrderDonut({ orderStats = {} }) {
  const data = Object.entries(orderStats).filter(([, v]) => v > 0).map(([s, v]) => ({
    name: STATUS_DISPLAY[s]?.label || s, value: v, color: STATUS_DISPLAY[s]?.chart || '#888',
  }));
  const total = data.reduce((a, d) => a + d.value, 0);

  if (!total) return <div className="h-44 flex items-center justify-center font-body text-xs text-textMuted">No orders yet</div>;

  return (
    <div className="relative">
      <ResponsiveContainer width="100%" height={164}>
        <PieChart>
          <Pie data={data} cx="50%" cy="50%" innerRadius={48} outerRadius={72} dataKey="value" strokeWidth={0}>
            {data.map((d, i) => <Cell key={i} fill={d.color} />)}
          </Pie>
          <Tooltip contentStyle={{ background: '#f5f4f0', border: '1px solid #e0ddd8', borderRadius: 10, fontFamily: 'Satoshi', fontSize: 11 }} />
        </PieChart>
      </ResponsiveContainer>
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        <div className="text-center">
          <p className="font-display text-2xl font-bold text-textPrimary leading-none">{total}</p>
          <p className="font-body text-[9px] text-textMuted uppercase tracking-wider">Orders</p>
        </div>
      </div>
    </div>
  );
}

// ── Main ──────────────────────────────────────────────────────────────────────

export default function AdminDashboardPage() {
  const { data: dash, isLoading } = useQuery({
    queryKey: ['admin-dashboard'],
    queryFn: () => api.get('/admin/dashboard').then((r) => r.data.data),
    staleTime: 60_000,
  });

  const totalOrders = dash ? Object.values(dash.orderStats || {}).reduce((a, b) => a + b, 0) : 0;

  return (
    <div className="p-6 md:p-8 min-h-screen">
      {/* Header */}
      <div className="mb-7">
        <h1 className="font-display text-2xl text-textPrimary">Dashboard</h1>
        <p className="font-body text-xs text-textSecondary mt-0.5">
          {new Date().toLocaleDateString('en-IN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
        </p>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard label="Total Revenue" value={dash?.totalRevenue || 0} icon={IndianRupee} isCurrency trend={12} />
        <StatCard label="Today's Revenue" value={dash?.todayRevenue || 0} icon={TrendingUp} isCurrency delay={0.08} />
        <StatCard label="Total Orders" value={totalOrders} icon={ShoppingCart} trend={8} delay={0.16} />
        <StatCard label="Total Users" value={dash?.totalUsers || 0} icon={Users} trend={5} delay={0.24} />
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-5 mb-6">
        <div className="lg:col-span-3 bg-surface border border-border rounded-2xl p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-display text-base text-textPrimary">Revenue — Last 30 Days</h2>
            <span className="font-mono text-xs text-accent">{formatPrice(dash?.monthRevenue || 0)} this month</span>
          </div>
          <RevenueChart />
        </div>

        <div className="lg:col-span-2 bg-surface border border-border rounded-2xl p-5">
          <h2 className="font-display text-base text-textPrimary mb-1">Orders by Status</h2>
          <OrderDonut orderStats={dash?.orderStats} />
          <div className="mt-2 grid grid-cols-2 gap-x-3 gap-y-1.5">
            {Object.entries(dash?.orderStats || {}).filter(([, v]) => v > 0).map(([s, v]) => (
              <div key={s} className="flex items-center gap-1.5">
                <div className="w-2 h-2 rounded-full shrink-0" style={{ background: STATUS_DISPLAY[s]?.chart || '#888' }} />
                <span className="font-body text-[10px] text-textSecondary truncate">{STATUS_DISPLAY[s]?.label || s}</span>
                <span className="font-mono text-[10px] text-textMuted ml-auto">{v}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Recent Orders + Top Products */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-5">
        <div className="lg:col-span-3 bg-surface border border-border rounded-2xl p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-display text-base text-textPrimary">Recent Orders</h2>
            <Link to="/admin/orders" className="font-body text-xs text-accent hover:underline">View all →</Link>
          </div>
          {isLoading ? (
            <div className="space-y-2">{[1,2,3,4,5].map(i => <div key={i} className="h-9 rounded-xl bg-surface2 animate-pulse" />)}</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="border-b border-border">
                    {['Order #', 'Customer', 'Amount', 'Status', 'Date', ''].map((h) => (
                      <th key={h} className="pb-2 pr-3 font-body text-[10px] font-semibold text-textMuted uppercase tracking-widest whitespace-nowrap">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {(dash?.recentOrders || []).map((o) => (
                    <tr key={o._id} className="border-b border-border/50 hover:bg-surface2 transition-colors group">
                      <td className="py-2.5 pr-3 font-mono text-xs text-accent">{o.orderNumber}</td>
                      <td className="py-2.5 pr-3 font-body text-xs text-textPrimary max-w-[90px] truncate">{o.user?.name || '—'}</td>
                      <td className="py-2.5 pr-3 font-mono text-xs whitespace-nowrap">{formatPrice(o.pricing?.total || 0)}</td>
                      <td className="py-2.5 pr-3">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-body font-bold uppercase tracking-wide border ${STATUS_DISPLAY[o.orderStatus]?.badge || 'bg-surface text-textMuted border-border'}`}>
                          {STATUS_DISPLAY[o.orderStatus]?.label || o.orderStatus}
                        </span>
                      </td>
                      <td className="py-2.5 pr-3 font-body text-xs text-textMuted whitespace-nowrap">{formatDate(o.createdAt)}</td>
                      <td className="py-2.5">
                        <Link to="/admin/orders" className="hidden group-hover:flex w-7 h-7 rounded-lg border border-border items-center justify-center text-textMuted hover:border-accent hover:text-accent transition-all">
                          <Eye size={12} strokeWidth={1.8} />
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div className="lg:col-span-2 bg-surface border border-border rounded-2xl p-5">
          <h2 className="font-display text-base text-textPrimary mb-4">Top Products</h2>
          <div className="space-y-3">
            {(dash?.topProducts || []).map((p, i) => (
              <div key={p._id || i} className="flex items-center gap-3">
                <span className={cn('w-6 h-6 rounded-lg flex items-center justify-center font-mono text-xs font-bold shrink-0', i === 0 ? 'bg-gold/15 text-gold' : 'bg-surface2 text-textMuted')}>
                  {i + 1}
                </span>
                <div className="flex-1 min-w-0">
                  <p className="font-body text-xs font-medium text-textPrimary truncate">{p.name}</p>
                  <p className="font-mono text-[10px] text-textMuted">{p.totalSold} units sold</p>
                </div>
                <span className="font-mono text-xs text-accent shrink-0">{formatPrice(p.revenue || 0)}</span>
              </div>
            ))}
            {!isLoading && !dash?.topProducts?.length && (
              <p className="font-body text-xs text-textMuted text-center py-8">No sales data yet</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
