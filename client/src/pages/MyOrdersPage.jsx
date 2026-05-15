import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import { Package, ChevronRight } from 'lucide-react';
import api from '../lib/axios';
import { formatPrice, formatDate, cn } from '../lib/utils';
import { Skeleton, EmptyState } from '../components/ui';

// ── Status config ──────────────────────────────────────────────────────────────

const STATUS_DISPLAY = {
  pending:          { label: 'Pending',          color: 'bg-amber-50 text-amber-700 border-amber-200' },
  confirmed:        { label: 'Confirmed',         color: 'bg-blue-50 text-blue-700 border-blue-200' },
  processing:       { label: 'Processing',        color: 'bg-violet-50 text-violet-700 border-violet-200' },
  shipped:          { label: 'Shipped',           color: 'bg-sky-50 text-sky-700 border-sky-200' },
  out_for_delivery: { label: 'Out for Delivery',  color: 'bg-orange-50 text-orange-700 border-orange-200' },
  delivered:        { label: 'Delivered',         color: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  cancelled:        { label: 'Cancelled',         color: 'bg-red-50 text-red-700 border-red-200' },
};

const FILTER_TABS = [
  { value: 'all', label: 'All' },
  { value: 'pending', label: 'Pending' },
  { value: 'confirmed', label: 'Confirmed' },
  { value: 'shipped', label: 'Shipped' },
  { value: 'delivered', label: 'Delivered' },
  { value: 'cancelled', label: 'Cancelled' },
];

// ── Order card ─────────────────────────────────────────────────────────────────

function OrderCard({ order }) {
  const statusInfo = STATUS_DISPLAY[order.orderStatus] || { label: order.orderStatus, color: 'bg-surface text-textSecondary border-border' };
  const previewItems = order.items.slice(0, 2);
  const extraCount = order.items.length - 2;

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      transition={{ duration: 0.35, ease: 'easeOut' }}
      className="bg-background rounded-2xl border border-border p-4 md:p-5 hover:border-accent/30 hover:shadow-sm transition-all duration-200"
    >
      {/* Header row */}
      <div className="flex items-start justify-between gap-3 mb-4">
        <div>
          <p className="font-mono text-xs text-accent font-semibold mb-0.5">#{order.orderNumber}</p>
          <p className="font-body text-xs text-textMuted">{formatDate(order.createdAt)}</p>
        </div>
        <span
          className={`inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-body font-bold uppercase tracking-wide border shrink-0 ${statusInfo.color}`}
        >
          {statusInfo.label}
        </span>
      </div>

      {/* Item previews */}
      <div className="flex items-center gap-2 mb-4">
        <div className="flex items-center gap-1.5">
          {previewItems.map((item, i) => (
            <div key={i} className="w-12 h-12 rounded-xl bg-surface2 border border-border overflow-hidden shrink-0">
              {item.image && <img src={item.image} alt={item.name} className="w-full h-full object-cover" />}
            </div>
          ))}
          {extraCount > 0 && (
            <div className="w-12 h-12 rounded-xl bg-surface2 border border-border flex items-center justify-center shrink-0">
              <span className="font-body text-xs text-textSecondary font-medium">+{extraCount}</span>
            </div>
          )}
        </div>
        <div className="flex-1 min-w-0 ml-1">
          <p className="font-body text-sm text-textPrimary line-clamp-1">
            {order.items[0]?.name}
            {order.items.length > 1 && ` + ${order.items.length - 1} more`}
          </p>
          <p className="font-body text-xs text-textMuted mt-0.5">
            {order.paymentMethod === 'cod' ? 'Cash on Delivery' : 'Paytm / Online'}
          </p>
        </div>
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between pt-3 border-t border-border">
        <div>
          <p className="font-body text-[10px] text-textMuted uppercase tracking-wider">Total</p>
          <p className="font-mono text-base font-bold text-textPrimary">{formatPrice(order.pricing.total)}</p>
        </div>
        <Link
          to={`/orders/${order._id}`}
          className="flex items-center gap-1.5 px-4 py-2 rounded-xl border border-border font-body text-sm text-textSecondary hover:border-accent hover:text-accent transition-all duration-200"
        >
          View Details
          <ChevronRight size={13} strokeWidth={2} />
        </Link>
      </div>
    </motion.div>
  );
}

// ── Skeleton ───────────────────────────────────────────────────────────────────

function OrderCardSkeleton() {
  return (
    <div className="bg-background rounded-2xl border border-border p-5 space-y-4">
      <div className="flex justify-between">
        <div className="space-y-2">
          <Skeleton width={120} height={12} />
          <Skeleton width={80} height={10} />
        </div>
        <Skeleton width={80} height={24} rounded="rounded-full" />
      </div>
      <div className="flex gap-2">
        {[1, 2].map((i) => <Skeleton key={i} width={48} height={48} rounded="rounded-xl" />)}
      </div>
      <div className="flex justify-between items-center pt-3 border-t border-border">
        <Skeleton width={80} height={20} />
        <Skeleton width={110} height={36} rounded="rounded-xl" />
      </div>
    </div>
  );
}

// ── Main page ──────────────────────────────────────────────────────────────────

export default function MyOrdersPage() {
  const [activeTab, setActiveTab] = useState('all');

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['orders'],
    queryFn: () => api.get('/orders', { params: { limit: 50 } }).then((r) => r.data.data),
  });

  const allOrders = data?.orders || [];
  const filtered =
    activeTab === 'all'
      ? allOrders
      : allOrders.filter((o) => o.orderStatus === activeTab);

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-4xl mx-auto px-5 py-8">
        {/* Header */}
        <div className="mb-6">
          <h1 className="font-display text-3xl md:text-4xl text-textPrimary mb-1">My Orders</h1>
          <p className="font-body text-sm text-textSecondary">
            {allOrders.length} order{allOrders.length !== 1 ? 's' : ''} placed
          </p>
        </div>

        {/* Filter tabs */}
        <div className="overflow-x-auto mb-6">
          <div className="flex gap-1.5 min-w-max pb-1">
            {FILTER_TABS.map((tab) => {
              const count = tab.value === 'all'
                ? allOrders.length
                : allOrders.filter((o) => o.orderStatus === tab.value).length;

              return (
                <button
                  key={tab.value}
                  onClick={() => setActiveTab(tab.value)}
                  className={cn(
                    'relative px-4 py-2 rounded-full font-body text-xs font-semibold transition-all duration-200',
                    activeTab === tab.value
                      ? 'bg-accent text-white'
                      : 'bg-surface border border-border text-textSecondary hover:border-accent/50 hover:text-textPrimary'
                  )}
                >
                  {tab.label}
                  {count > 0 && activeTab !== tab.value && (
                    <span className="ml-1.5 font-mono text-[9px] opacity-60">{count}</span>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Content */}
        {isLoading && (
          <div className="space-y-4">
            {[1, 2, 3].map((i) => <OrderCardSkeleton key={i} />)}
          </div>
        )}

        {isError && (
          <div className="flex flex-col items-center py-16 gap-4">
            <p className="font-body text-textSecondary">Couldn't load orders.</p>
            <button
              onClick={() => refetch()}
              className="px-5 py-2.5 rounded-xl border border-border font-body text-sm text-textSecondary hover:border-accent hover:text-accent transition-all duration-200"
            >
              Retry
            </button>
          </div>
        )}

        {!isLoading && !isError && filtered.length === 0 && (
          <EmptyState
            icon={Package}
            title={activeTab === 'all' ? 'No orders yet' : `No ${activeTab} orders`}
            description={
              activeTab === 'all'
                ? 'Place your first order and it will appear here.'
                : 'Try selecting a different status above.'
            }
            action={
              activeTab === 'all'
                ? { label: 'Start Shopping', onClick: () => window.location.href = '/shop' }
                : undefined
            }
          />
        )}

        {!isLoading && !isError && filtered.length > 0 && (
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="space-y-4"
            >
              {filtered.map((order) => (
                <OrderCard key={order._id} order={order} />
              ))}
            </motion.div>
          </AnimatePresence>
        )}
      </div>
    </div>
  );
}
