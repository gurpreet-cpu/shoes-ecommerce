import { useState, useRef, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { AnimatePresence, motion } from 'framer-motion';
import { Search, ChevronDown, X } from 'lucide-react';
import api from '../../lib/axios';
import { toast } from '../../lib/toast';
import { formatPrice, formatDate, cn } from '../../lib/utils';
import { Pagination } from '../../components/ui';

const STATUS_DISPLAY = {
  pending:          { label: 'Pending',         badge: 'bg-amber-50 text-amber-700 border-amber-200' },
  confirmed:        { label: 'Confirmed',        badge: 'bg-blue-50 text-blue-700 border-blue-200' },
  processing:       { label: 'Processing',       badge: 'bg-violet-50 text-violet-700 border-violet-200' },
  shipped:          { label: 'Shipped',          badge: 'bg-sky-50 text-sky-700 border-sky-200' },
  out_for_delivery: { label: 'Out for Delivery', badge: 'bg-orange-50 text-orange-700 border-orange-200' },
  delivered:        { label: 'Delivered',        badge: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  cancelled:        { label: 'Cancelled',        badge: 'bg-red-50 text-red-700 border-red-200' },
};

const TRANSITIONS = {
  pending:          ['confirmed', 'cancelled'],
  confirmed:        ['processing', 'cancelled'],
  processing:       ['shipped', 'cancelled'],
  shipped:          ['out_for_delivery'],
  out_for_delivery: ['delivered'],
  delivered: [], cancelled: [],
};

const STATUS_TABS = [
  { value: '', label: 'All' },
  { value: 'pending', label: 'Pending' },
  { value: 'confirmed', label: 'Confirmed' },
  { value: 'processing', label: 'Processing' },
  { value: 'shipped', label: 'Shipped' },
  { value: 'out_for_delivery', label: 'On The Way' },
  { value: 'delivered', label: 'Delivered' },
  { value: 'cancelled', label: 'Cancelled' },
];

function Chip({ active, onClick, children }) {
  return (
    <button onClick={onClick} className={cn('shrink-0 px-3 py-1.5 rounded-full font-body text-xs font-medium border transition-all duration-200', active ? 'bg-accent border-accent text-white' : 'bg-background border-border text-textSecondary hover:border-accent/50')}>
      {children}
    </button>
  );
}

function StatusSelector({ orderId, currentStatus, onUpdate }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  const next = TRANSITIONS[currentStatus] || [];
  const info = STATUS_DISPLAY[currentStatus];

  useEffect(() => {
    const h = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, []);

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => next.length > 0 && setOpen((v) => !v)}
        className={cn('inline-flex items-center gap-1 px-2 py-1 rounded-full text-[10px] font-body font-bold uppercase tracking-wide border', info?.badge || 'bg-surface text-textMuted border-border', next.length > 0 && 'cursor-pointer')}
      >
        {info?.label || currentStatus}
        {next.length > 0 && <ChevronDown size={10} strokeWidth={2.5} className={cn('transition-transform', open && 'rotate-180')} />}
      </button>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.14 }}
            className="absolute left-0 top-full mt-1 z-50 bg-background border border-border rounded-xl shadow-xl overflow-hidden min-w-[150px]"
          >
            <div className="p-1">
              {next.map((s) => (
                <button key={s} onClick={() => { onUpdate(orderId, s); setOpen(false); }}
                  className="flex items-center gap-2 w-full px-3 py-2 rounded-lg hover:bg-surface font-body text-sm text-textPrimary text-left transition-colors">
                  <div className="w-2 h-2 rounded-full" style={{ background: { pending: '#f59e0b', confirmed: '#3b82f6', processing: '#7c3aed', shipped: '#0ea5e9', out_for_delivery: '#f97316', delivered: '#10b981', cancelled: '#ef4444' }[s] || '#888' }} />
                  {STATUS_DISPLAY[s]?.label || s}
                </button>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default function AdminOrdersPage() {
  const queryClient = useQueryClient();
  const [searchParams, setSearchParams] = useSearchParams();
  const [search, setSearch] = useState('');

  const status = searchParams.get('status') || '';
  const paymentMethod = searchParams.get('paymentMethod') || '';
  const dateFrom = searchParams.get('dateFrom') || '';
  const dateTo = searchParams.get('dateTo') || '';
  const page = parseInt(searchParams.get('page') || '1');

  const setParam = (key, value) => {
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      if (!value) next.delete(key); else next.set(key, value);
      if (key !== 'page') next.delete('page');
      return next;
    });
  };

  const apiParams = { ...(status && { status }), ...(paymentMethod && { paymentMethod }), ...(dateFrom && { dateFrom }), ...(dateTo && { dateTo }), page, limit: 20 };

  const queryKey = ['admin-orders', apiParams];

  const { data, isLoading } = useQuery({
    queryKey,
    queryFn: () => api.get('/admin/orders', { params: apiParams }).then((r) => r.data.data),
    keepPreviousData: true,
  });

  const orders = data?.orders || [];
  const displayed = search ? orders.filter((o) => o.orderNumber?.toLowerCase().includes(search.toLowerCase())) : orders;

  const statusMutation = useMutation({
    mutationFn: ({ orderId, newStatus }) => api.put(`/admin/orders/${orderId}/status`, { status: newStatus }),
    onMutate: async ({ orderId, newStatus }) => {
      await queryClient.cancelQueries({ queryKey });
      const prev = queryClient.getQueryData(queryKey);
      queryClient.setQueryData(queryKey, (old) => old ? { ...old, orders: old.orders.map((o) => o._id === orderId ? { ...o, orderStatus: newStatus } : o) } : old);
      return { prev };
    },
    onError: (_, __, ctx) => { queryClient.setQueryData(queryKey, ctx?.prev); toast.error('Failed to update status'); },
    onSuccess: () => { toast.success('Order status updated'); queryClient.invalidateQueries({ queryKey: ['admin-orders'] }); queryClient.invalidateQueries({ queryKey: ['admin-dashboard'] }); },
  });

  return (
    <div className="p-6 md:p-8 min-h-screen">
      <div className="mb-6">
        <h1 className="font-display text-2xl text-textPrimary">Orders</h1>
        <p className="font-body text-xs text-textSecondary mt-0.5">{data?.totalCount || 0} total orders</p>
      </div>

      {/* Filters */}
      <div className="bg-surface border border-border rounded-2xl p-4 mb-5 space-y-3">
        <div className="overflow-x-auto">
          <div className="flex gap-1.5 min-w-max">
            {STATUS_TABS.map((t) => <Chip key={t.value} active={status === t.value} onClick={() => setParam('status', t.value)}>{t.label}</Chip>)}
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex gap-1.5">
            {[{ v: '', l: 'All Payment' }, { v: 'cod', l: 'COD' }, { v: 'paytm', l: 'Paytm' }].map((o) => (
              <Chip key={o.v} active={paymentMethod === o.v} onClick={() => setParam('paymentMethod', o.v)}>{o.l}</Chip>
            ))}
          </div>
          <div className="flex items-center gap-2 ml-auto flex-wrap">
            <input type="date" value={dateFrom} onChange={(e) => setParam('dateFrom', e.target.value)} className="px-3 py-1.5 rounded-xl border border-border bg-background font-body text-xs outline-none focus:border-accent transition-colors" />
            <span className="font-body text-xs text-textMuted">to</span>
            <input type="date" value={dateTo} onChange={(e) => setParam('dateTo', e.target.value)} className="px-3 py-1.5 rounded-xl border border-border bg-background font-body text-xs outline-none focus:border-accent transition-colors" />
            {(dateFrom || dateTo) && <button onClick={() => { setParam('dateFrom', ''); setParam('dateTo', ''); }} className="p-1.5 text-textMuted hover:text-red-500 transition-colors"><X size={13} strokeWidth={2} /></button>}
            <div className="relative">
              <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-textMuted" strokeWidth={1.8} />
              <input type="text" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Order #" className="pl-8 pr-3 py-1.5 rounded-xl border border-border bg-background font-mono text-xs placeholder:text-textMuted outline-none focus:border-accent transition-colors w-28" />
            </div>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="bg-surface border border-border rounded-2xl overflow-hidden mb-5">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="border-b border-border">
              <tr>
                {['Order #', 'Customer', 'Items', 'Amount', 'Payment', 'Status', 'Date'].map((h) => (
                  <th key={h} className="px-4 py-3 font-body text-[10px] font-semibold text-textMuted uppercase tracking-widest whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                Array.from({ length: 8 }).map((_, i) => (
                  <tr key={i} className="border-b border-border/40">
                    {Array.from({ length: 7 }).map((_, j) => <td key={j} className="px-4 py-3"><div className="h-4 rounded bg-surface2 animate-pulse w-16" /></td>)}
                  </tr>
                ))
              ) : displayed.length === 0 ? (
                <tr><td colSpan={7} className="px-4 py-16 text-center font-body text-sm text-textMuted">No orders found</td></tr>
              ) : (
                displayed.map((o) => (
                  <tr key={o._id} className="border-b border-border/40 hover:bg-background transition-colors">
                    <td className="px-4 py-3 font-mono text-xs text-accent">{o.orderNumber}</td>
                    <td className="px-4 py-3">
                      <p className="font-body text-xs text-textPrimary">{o.user?.name || '—'}</p>
                      <p className="font-body text-[10px] text-textMuted">{o.user?.email || ''}</p>
                    </td>
                    <td className="px-4 py-3 font-body text-xs text-textSecondary">{o.items?.length || 0}</td>
                    <td className="px-4 py-3 font-mono text-xs whitespace-nowrap">{formatPrice(o.pricing?.total || 0)}</td>
                    <td className="px-4 py-3 font-body text-[10px] font-semibold uppercase text-textSecondary">{o.paymentMethod === 'cod' ? 'COD' : 'Paytm'}</td>
                    <td className="px-4 py-3">
                      <StatusSelector orderId={o._id} currentStatus={o.orderStatus} onUpdate={(id, s) => statusMutation.mutate({ orderId: id, newStatus: s })} />
                    </td>
                    <td className="px-4 py-3 font-body text-xs text-textMuted whitespace-nowrap">{formatDate(o.createdAt)}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {data?.totalPages > 1 && (
        <div className="flex justify-center">
          <Pagination currentPage={page} totalPages={data.totalPages} onPageChange={(p) => setParam('page', p === 1 ? '' : String(p))} />
        </div>
      )}
    </div>
  );
}
