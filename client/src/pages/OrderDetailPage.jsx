import { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { ChevronRight, Home, Check, AlertCircle, X } from 'lucide-react';
import api from '../lib/axios';
import { toast } from '../lib/toast';
import { formatPrice, formatDate, cn } from '../lib/utils';
import { Skeleton, Modal } from '../components/ui';

// ── Status config ──────────────────────────────────────────────────────────────

const STATUS_DISPLAY = {
  pending:          { label: 'Pending',         color: 'bg-amber-50 text-amber-700 border-amber-200' },
  confirmed:        { label: 'Confirmed',        color: 'bg-blue-50 text-blue-700 border-blue-200' },
  processing:       { label: 'Processing',       color: 'bg-violet-50 text-violet-700 border-violet-200' },
  shipped:          { label: 'Shipped',          color: 'bg-sky-50 text-sky-700 border-sky-200' },
  out_for_delivery: { label: 'Out for Delivery', color: 'bg-orange-50 text-orange-700 border-orange-200' },
  delivered:        { label: 'Delivered',        color: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  cancelled:        { label: 'Cancelled',        color: 'bg-red-50 text-red-700 border-red-200' },
};

const STATUS_STEPS = ['pending', 'confirmed', 'processing', 'shipped', 'out_for_delivery', 'delivered'];
const CANCELLABLE = ['pending', 'confirmed', 'processing'];

// ── Status Timeline ────────────────────────────────────────────────────────────

function StatusTimeline({ orderStatus, statusHistory }) {
  const completedSet = new Set(statusHistory.map((h) => h.status));
  const isCancelled = orderStatus === 'cancelled';

  const getTimestamp = (status) => statusHistory.find((h) => h.status === status)?.timestamp;
  const getNote = (status) => statusHistory.find((h) => h.status === status)?.note;

  const steps = isCancelled
    ? [...STATUS_STEPS.filter((s) => completedSet.has(s) && s !== 'cancelled'), 'cancelled']
    : STATUS_STEPS;

  return (
    <div className="relative">
      {steps.map((status, i) => {
        const isDone = completedSet.has(status);
        const isCurrent = status === orderStatus && status !== 'delivered';
        const info = STATUS_DISPLAY[status] || { label: status };
        const ts = getTimestamp(status);
        const note = getNote(status);
        const isLast = i === steps.length - 1;

        return (
          <div key={status} className="flex gap-4">
            <div className="flex flex-col items-center">
              <div className="relative">
                <div className={cn(
                  'w-8 h-8 rounded-full border-2 flex items-center justify-center transition-all duration-300',
                  isDone ? 'bg-accent border-accent' : 'bg-background border-border'
                )}>
                  {isDone ? (
                    <Check size={14} strokeWidth={2.5} className="text-white" />
                  ) : (
                    <div className={cn('w-2 h-2 rounded-full', isCurrent ? 'bg-accent' : 'bg-border')} />
                  )}
                </div>
                {isCurrent && (
                  <motion.div
                    className="absolute inset-0 rounded-full border-2 border-accent"
                    animate={{ scale: [1, 1.4, 1], opacity: [0.8, 0.2, 0.8] }}
                    transition={{ duration: 2, repeat: Infinity }}
                  />
                )}
              </div>
              {!isLast && (
                <div className={cn(
                  'w-0.5 flex-1 my-1 min-h-[24px] rounded-full transition-colors duration-300',
                  isDone && completedSet.has(steps[i + 1]) ? 'bg-accent' : 'bg-border'
                )} />
              )}
            </div>
            <div className={cn('pb-6', isLast && 'pb-0')}>
              <p className={cn('font-body text-sm font-semibold leading-tight', isDone ? 'text-textPrimary' : 'text-textMuted')}>
                {info.label}
              </p>
              {ts && <p className="font-body text-xs text-textMuted mt-0.5">{formatDate(ts)}</p>}
              {note && <p className="font-body text-xs text-textSecondary italic mt-1">{note}</p>}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ── Cancel Modal ───────────────────────────────────────────────────────────────

function CancelModal({ open, onClose, orderId }) {
  const [reason, setReason] = useState('');
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: () => api.put(`/orders/${orderId}/cancel`, { reason }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['order', orderId] });
      queryClient.invalidateQueries({ queryKey: ['orders'] });
      toast.success('Order cancelled successfully');
      onClose();
    },
    onError: (err) => {
      toast.error(err.response?.data?.message || 'Could not cancel order');
    },
  });

  return (
    <Modal open={open} onClose={onClose} title="Cancel Order" size="sm">
      <p className="font-body text-sm text-textSecondary mb-4">
        Are you sure you want to cancel this order? This action cannot be undone.
      </p>
      <div className="flex flex-col gap-1.5 mb-5">
        <label className="font-body text-xs font-semibold text-textSecondary">Reason (optional)</label>
        <textarea
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          placeholder="Why are you cancelling?"
          rows={3}
          className="w-full px-4 py-3 rounded-xl bg-surface border border-border font-body text-sm text-textPrimary placeholder:text-textMuted outline-none focus:border-red-400 transition-colors resize-none"
        />
      </div>
      <div className="flex gap-3">
        <button onClick={onClose} className="flex-1 py-3 rounded-xl border border-border font-body text-sm text-textSecondary hover:border-accent hover:text-accent transition-all duration-200">
          Keep Order
        </button>
        <motion.button
          whileHover={{ scale: 1.01 }}
          whileTap={{ scale: 0.99 }}
          disabled={mutation.isPending}
          onClick={() => mutation.mutate()}
          className="flex-1 py-3 rounded-xl bg-red-500 text-white font-body font-semibold text-sm hover:bg-red-600 transition-colors duration-200 disabled:opacity-55"
        >
          {mutation.isPending ? 'Cancelling…' : 'Yes, Cancel'}
        </motion.button>
      </div>
    </Modal>
  );
}

// ── Section wrapper ────────────────────────────────────────────────────────────

function Section({ title, children }) {
  return (
    <div className="bg-surface rounded-2xl border border-border p-5">
      <h3 className="font-display text-base text-textPrimary mb-4">{title}</h3>
      {children}
    </div>
  );
}

// ── Main page ──────────────────────────────────────────────────────────────────

export default function OrderDetailPage() {
  const { id } = useParams();
  const [cancelOpen, setCancelOpen] = useState(false);

  const { data: order, isLoading, isError } = useQuery({
    queryKey: ['order', id],
    queryFn: () => api.get(`/orders/${id}`).then((r) => r.data.data),
  });

  if (isLoading) {
    return (
      <div className="max-w-4xl mx-auto px-5 py-10 space-y-5">
        <Skeleton height={24} width="40%" />
        <div className="grid grid-cols-1 md:grid-cols-[1fr_300px] gap-5">
          <div className="space-y-4">
            <Skeleton height={200} width="100%" rounded="rounded-2xl" />
            <Skeleton height={160} width="100%" rounded="rounded-2xl" />
          </div>
          <Skeleton height={240} width="100%" rounded="rounded-2xl" />
        </div>
      </div>
    );
  }

  if (isError || !order) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center gap-4 px-5">
        <AlertCircle size={40} className="text-textMuted" strokeWidth={1.5} />
        <p className="font-display text-2xl text-textPrimary">Order not found</p>
        <Link to="/orders" className="font-body text-sm text-accent hover:underline">← Back to orders</Link>
      </div>
    );
  }

  const statusInfo = STATUS_DISPLAY[order.orderStatus] || { label: order.orderStatus, color: 'bg-surface text-textSecondary border-border' };
  const canCancel = CANCELLABLE.includes(order.orderStatus);

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-4xl mx-auto px-5 py-8">
        {/* Breadcrumb */}
        <div className="flex items-center gap-1.5 mb-6">
          <Link to="/" className="flex items-center gap-1 font-body text-xs text-textMuted hover:text-accent transition-colors">
            <Home size={12} strokeWidth={1.8} />Home
          </Link>
          <ChevronRight size={11} className="text-textMuted" strokeWidth={1.5} />
          <Link to="/orders" className="font-body text-xs text-textMuted hover:text-accent transition-colors">Orders</Link>
          <ChevronRight size={11} className="text-textMuted" strokeWidth={1.5} />
          <span className="font-mono text-xs text-textSecondary">#{order.orderNumber}</span>
        </div>

        {/* Header */}
        <div className="flex flex-wrap items-start justify-between gap-4 mb-7">
          <div>
            <div className="flex items-center gap-3 mb-1">
              <h1 className="font-display text-2xl text-textPrimary">Order Detail</h1>
              <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-body font-bold uppercase tracking-wide border ${statusInfo.color}`}>
                {statusInfo.label}
              </span>
            </div>
            <p className="font-mono text-sm text-accent">#{order.orderNumber}</p>
            <p className="font-body text-xs text-textMuted mt-0.5">Placed on {formatDate(order.createdAt)}</p>
          </div>
          {canCancel && (
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => setCancelOpen(true)}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-red-200 text-red-500 font-body text-sm font-medium hover:bg-red-50 transition-all duration-200"
            >
              <X size={14} strokeWidth={2} />
              Cancel Order
            </motion.button>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-[1fr_300px] gap-5">
          {/* Left */}
          <div className="space-y-5">
            <Section title="Order Status">
              <StatusTimeline orderStatus={order.orderStatus} statusHistory={order.statusHistory || []} />
            </Section>

            <Section title="Items Ordered">
              <div className="space-y-4">
                {order.items.map((item, i) => (
                  <div key={i} className="flex gap-4">
                    <div className="w-16 h-16 rounded-xl bg-surface2 border border-border overflow-hidden shrink-0">
                      {item.image && <img src={item.image} alt={item.name} className="w-full h-full object-cover" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-body text-sm font-medium text-textPrimary line-clamp-1">{item.name}</p>
                      <p className="font-body text-xs text-textMuted mt-0.5">Size: UK {item.size} · Qty: {item.quantity}</p>
                    </div>
                    <p className="font-mono text-sm font-semibold text-accent shrink-0">
                      {formatPrice(item.price * item.quantity)}
                    </p>
                  </div>
                ))}
              </div>
            </Section>

            <Section title="Delivery Address">
              <p className="font-body text-sm font-semibold text-textPrimary">{order.shippingAddress.name}</p>
              <p className="font-body text-sm text-textSecondary">{order.shippingAddress.phone}</p>
              <p className="font-body text-sm text-textSecondary leading-relaxed mt-0.5">
                {order.shippingAddress.street}, {order.shippingAddress.city},{' '}
                {order.shippingAddress.state} — {order.shippingAddress.pincode}
              </p>
            </Section>
          </div>

          {/* Right */}
          <div className="space-y-5">
            <Section title="Price Breakdown">
              <div className="space-y-2.5">
                <div className="flex justify-between font-body text-sm">
                  <span className="text-textSecondary">Subtotal</span>
                  <span className="text-textPrimary">{formatPrice(order.pricing.subtotal)}</span>
                </div>
                {order.pricing.discount > 0 && (
                  <div className="flex justify-between font-body text-sm">
                    <span className="text-textSecondary">
                      Discount {order.coupon?.code && <span className="font-mono text-[10px] text-accent ml-1">({order.coupon.code})</span>}
                    </span>
                    <span className="text-accent3">−{formatPrice(order.pricing.discount)}</span>
                  </div>
                )}
                <div className="flex justify-between font-body text-sm">
                  <span className="text-textSecondary">Shipping</span>
                  <span className={order.pricing.shippingCharge === 0 ? 'text-accent3' : 'text-textPrimary'}>
                    {order.pricing.shippingCharge === 0 ? 'FREE' : formatPrice(order.pricing.shippingCharge)}
                  </span>
                </div>
                <div className="flex justify-between font-display text-base pt-2 border-t border-border">
                  <span className="text-textPrimary">Total</span>
                  <span className="text-textPrimary font-bold">{formatPrice(order.pricing.total)}</span>
                </div>
              </div>
            </Section>

            <Section title="Payment">
              <div className="space-y-2">
                <div className="flex justify-between font-body text-sm">
                  <span className="text-textSecondary">Method</span>
                  <span className="text-textPrimary font-medium">
                    {order.paymentMethod === 'cod' ? 'Cash on Delivery' : 'Paytm / Online'}
                  </span>
                </div>
                <div className="flex justify-between font-body text-sm">
                  <span className="text-textSecondary">Status</span>
                  <span className={cn('font-medium capitalize', order.paymentStatus === 'paid' ? 'text-accent3' : 'text-amber-600')}>
                    {order.paymentStatus}
                  </span>
                </div>
                {order.paymentDetails?.transactionId && (
                  <div className="flex justify-between font-body text-sm">
                    <span className="text-textSecondary">Txn ID</span>
                    <span className="font-mono text-[10px] text-textPrimary">{order.paymentDetails.transactionId}</span>
                  </div>
                )}
              </div>
            </Section>

            <Link
              to="/orders"
              className="flex items-center justify-center gap-2 w-full py-3 rounded-xl border border-border font-body text-sm text-textSecondary hover:border-accent hover:text-accent transition-all duration-200"
            >
              ← Back to Orders
            </Link>
          </div>
        </div>
      </div>

      <CancelModal open={cancelOpen} onClose={() => setCancelOpen(false)} orderId={id} />
    </div>
  );
}
