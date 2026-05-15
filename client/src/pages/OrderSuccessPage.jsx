import { useParams, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { Package, ArrowRight, ShoppingBag } from 'lucide-react';
import api from '../lib/axios';
import { formatPrice, formatDate } from '../lib/utils';
import { Skeleton } from '../components/ui';

// ── Confetti ───────────────────────────────────────────────────────────────────

const COLORS = ['bg-accent', 'bg-accent2', 'bg-accent3', 'bg-gold', 'bg-orange-300', 'bg-violet-400'];

function Confetti() {
  const pieces = Array.from({ length: 28 }, (_, i) => ({
    id: i,
    x: 5 + (i / 28) * 90,
    color: COLORS[i % COLORS.length],
    delay: (i / 28) * 2.2,
    dur: 2.5 + (i % 4) * 0.5,
    size: i % 3 === 0 ? 'w-3 h-3' : 'w-2 h-2',
    drift: (i % 2 === 0 ? 1 : -1) * (20 + (i % 5) * 15),
  }));

  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none" aria-hidden>
      {pieces.map((p) => (
        <motion.div
          key={p.id}
          className={`absolute ${p.color} rounded-sm ${p.size} opacity-90`}
          style={{ left: `${p.x}%`, top: -12 }}
          animate={{
            y: ['0vh', '105vh'],
            x: [0, p.drift, -p.drift / 2],
            rotate: [0, 180 + p.drift * 2],
            opacity: [0.9, 0.9, 0],
          }}
          transition={{
            duration: p.dur,
            delay: p.delay,
            ease: 'linear',
            repeat: Infinity,
            repeatDelay: 1,
          }}
        />
      ))}
    </div>
  );
}

// ── Animated checkmark ─────────────────────────────────────────────────────────

function AnimatedCheck() {
  return (
    <div className="relative w-24 h-24 flex items-center justify-center mb-6">
      <svg viewBox="0 0 80 80" className="absolute inset-0 w-full h-full">
        <motion.circle
          cx="40"
          cy="40"
          r="36"
          fill="none"
          stroke="#06d6a0"
          strokeWidth="3"
          strokeLinecap="round"
          initial={{ pathLength: 0, opacity: 0 }}
          animate={{ pathLength: 1, opacity: 1 }}
          transition={{ duration: 0.7, ease: 'easeOut' }}
        />
        <motion.path
          d="M24 40 L35 51 L56 30"
          fill="none"
          stroke="#06d6a0"
          strokeWidth="4"
          strokeLinecap="round"
          strokeLinejoin="round"
          initial={{ pathLength: 0 }}
          animate={{ pathLength: 1 }}
          transition={{ duration: 0.5, delay: 0.6, ease: 'easeOut' }}
        />
      </svg>
      {/* Pulse ring */}
      <motion.div
        className="absolute inset-0 rounded-full border-2 border-accent3/30"
        animate={{ scale: [1, 1.2, 1.4], opacity: [0.6, 0.3, 0] }}
        transition={{ duration: 1.5, delay: 1, repeat: Infinity }}
      />
    </div>
  );
}

// ── Status badge ───────────────────────────────────────────────────────────────

const STATUS_COLORS = {
  pending: 'bg-amber-50 text-amber-700 border-amber-200',
  confirmed: 'bg-blue-50 text-blue-700 border-blue-200',
  processing: 'bg-violet-50 text-violet-700 border-violet-200',
  shipped: 'bg-sky-50 text-sky-700 border-sky-200',
  out_for_delivery: 'bg-orange-50 text-orange-700 border-orange-200',
  delivered: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  cancelled: 'bg-red-50 text-red-700 border-red-200',
};

const STATUS_LABELS = {
  pending: 'Pending',
  confirmed: 'Confirmed',
  processing: 'Processing',
  shipped: 'Shipped',
  out_for_delivery: 'Out for Delivery',
  delivered: 'Delivered',
  cancelled: 'Cancelled',
};

// ── Main ───────────────────────────────────────────────────────────────────────

export default function OrderSuccessPage() {
  const { id } = useParams();

  const { data: order, isLoading } = useQuery({
    queryKey: ['order', id],
    queryFn: () => api.get(`/orders/${id}`).then((r) => r.data.data),
  });

  if (isLoading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-6 px-5">
        <Skeleton width={96} height={96} rounded="rounded-full" />
        <Skeleton width={260} height={32} />
        <Skeleton width={180} height={20} />
        <div className="w-full max-w-md space-y-3">
          {[1, 2, 3].map((i) => <Skeleton key={i} height={56} width="100%" rounded="rounded-xl" />)}
        </div>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4 px-5">
        <Package size={40} className="text-textMuted" strokeWidth={1.5} />
        <p className="font-display text-2xl text-textPrimary">Order not found</p>
        <Link to="/orders" className="font-body text-sm text-accent hover:underline">View all orders</Link>
      </div>
    );
  }

  return (
    <div className="relative min-h-screen bg-background overflow-hidden">
      <Confetti />

      <div className="relative z-10 max-w-xl mx-auto px-5 py-16 flex flex-col items-center text-center">
        {/* Check animation */}
        <AnimatedCheck />

        {/* Heading */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.9, duration: 0.5 }}
        >
          <p className="font-body text-xs uppercase tracking-[0.22em] text-accent3 font-semibold mb-2">
            Payment Confirmed
          </p>
          <h1 className="font-display text-4xl md:text-5xl font-bold text-textPrimary mb-3">
            Order Placed!
          </h1>
          <p className="font-mono text-lg text-accent font-semibold mb-1">
            #{order.orderNumber}
          </p>
          <p className="font-body text-sm text-textSecondary mb-6">
            Placed on {formatDate(order.createdAt)} · Estimated delivery: 5–7 business days
          </p>

          {/* Status badge */}
          <span
            className={`inline-flex items-center px-3 py-1.5 rounded-full text-xs font-body font-semibold border mb-8 ${
              STATUS_COLORS[order.orderStatus] || 'bg-surface text-textSecondary border-border'
            }`}
          >
            {STATUS_LABELS[order.orderStatus] || order.orderStatus}
          </span>
        </motion.div>

        {/* Order summary card */}
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1.1, duration: 0.5 }}
          className="w-full bg-surface rounded-2xl border border-border p-5 mb-6 text-left"
        >
          {/* Items */}
          <p className="font-body text-xs uppercase tracking-widest text-textMuted mb-3">Items Ordered</p>
          <div className="space-y-3 mb-4">
            {order.items.map((item, i) => (
              <div key={i} className="flex gap-3">
                <div className="w-12 h-12 rounded-xl bg-surface2 border border-border overflow-hidden shrink-0">
                  {item.image && <img src={item.image} alt={item.name} className="w-full h-full object-cover" />}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-body text-sm text-textPrimary line-clamp-1">{item.name}</p>
                  <p className="font-body text-[10px] text-textMuted">Size {item.size} · Qty {item.quantity}</p>
                </div>
                <p className="font-mono text-sm text-accent font-semibold">{formatPrice(item.price * item.quantity)}</p>
              </div>
            ))}
          </div>

          {/* Pricing */}
          <div className="border-t border-border pt-3 space-y-1.5">
            {order.pricing.discount > 0 && (
              <div className="flex justify-between font-body text-sm">
                <span className="text-textSecondary">Discount</span>
                <span className="text-accent3">−{formatPrice(order.pricing.discount)}</span>
              </div>
            )}
            <div className="flex justify-between font-body text-sm">
              <span className="text-textSecondary">Shipping</span>
              <span className={order.pricing.shippingCharge === 0 ? 'text-accent3' : 'text-textPrimary'}>
                {order.pricing.shippingCharge === 0 ? 'FREE' : formatPrice(order.pricing.shippingCharge)}
              </span>
            </div>
            <div className="flex justify-between font-display text-base pt-1 border-t border-border">
              <span className="text-textPrimary">Total Paid</span>
              <span className="text-textPrimary font-bold">{formatPrice(order.pricing.total)}</span>
            </div>
          </div>

          {/* Delivery address */}
          <div className="border-t border-border mt-3 pt-3">
            <p className="font-body text-[10px] uppercase tracking-widest text-textMuted mb-1">Delivering to</p>
            <p className="font-body text-sm text-textPrimary">
              {order.shippingAddress.name} · {order.shippingAddress.phone}
            </p>
            <p className="font-body text-xs text-textSecondary leading-relaxed">
              {order.shippingAddress.street}, {order.shippingAddress.city},{' '}
              {order.shippingAddress.state} — {order.shippingAddress.pincode}
            </p>
          </div>

          {/* Payment method */}
          <div className="border-t border-border mt-3 pt-3 flex items-center justify-between">
            <p className="font-body text-[10px] uppercase tracking-widest text-textMuted">Payment</p>
            <span className="font-body text-xs font-semibold text-textPrimary uppercase">
              {order.paymentMethod === 'cod' ? 'Cash on Delivery' : 'Paytm / Online'}
            </span>
          </div>
        </motion.div>

        {/* Action buttons */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1.3, duration: 0.45 }}
          className="flex flex-col sm:flex-row gap-3 w-full"
        >
          <Link
            to={`/orders/${order._id}`}
            className="flex-1 flex items-center justify-center gap-2 py-3.5 rounded-xl bg-accent text-white font-body font-semibold text-sm hover:bg-orange-600 transition-colors duration-200"
          >
            <Package size={16} strokeWidth={2} />
            Track Order
          </Link>
          <Link
            to="/shop"
            className="flex-1 flex items-center justify-center gap-2 py-3.5 rounded-xl border-2 border-textPrimary/25 text-textPrimary font-body font-semibold text-sm hover:border-textPrimary hover:bg-textPrimary hover:text-background transition-all duration-200"
          >
            Continue Shopping
            <ArrowRight size={15} strokeWidth={2} />
          </Link>
        </motion.div>
      </div>
    </div>
  );
}
