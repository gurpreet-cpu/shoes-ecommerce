import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useQuery, useMutation } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import { useDispatch, useSelector } from 'react-redux';
import {
  Check, ChevronLeft, MapPin, CreditCard, Banknote, Tag, ShoppingBag, X,
} from 'lucide-react';
import api from '../lib/axios';
import { toast } from '../lib/toast';
import { clearCart } from '../store/cartSlice';
import { formatPrice, cn } from '../lib/utils';
import { Skeleton } from '../components/ui';

// ── Schemas ────────────────────────────────────────────────────────────────────

const addressSchema = z.object({
  name: z.string().min(2, 'Name required'),
  phone: z.string().regex(/^\d{10}$/, '10 digit phone number'),
  street: z.string().min(4, 'Street address required'),
  city: z.string().min(2, 'City required'),
  state: z.string().min(2, 'State required'),
  pincode: z.string().regex(/^\d{6}$/, '6 digit pincode'),
});

// ── Step indicator ─────────────────────────────────────────────────────────────

const STEPS = ['Address', 'Payment', 'Confirm'];

function StepIndicator({ step }) {
  return (
    <div className="flex items-center justify-center gap-0 py-6 px-5 border-b border-border bg-background">
      {STEPS.map((label, i) => {
        const idx = i + 1;
        const done = step > idx;
        const active = step === idx;
        return (
          <div key={label} className="flex items-center">
            <div className="flex flex-col items-center gap-1.5">
              <div className="relative">
                <div
                  className={cn(
                    'w-8 h-8 rounded-full border-2 flex items-center justify-center font-mono text-xs font-bold transition-all duration-300',
                    done
                      ? 'bg-accent border-accent text-white'
                      : active
                      ? 'border-accent text-accent bg-background'
                      : 'border-border text-textMuted bg-background'
                  )}
                >
                  {done ? <Check size={14} strokeWidth={2.5} /> : idx}
                </div>
                {active && (
                  <motion.div
                    className="absolute inset-0 rounded-full border-2 border-accent"
                    animate={{ scale: [1, 1.35, 1], opacity: [1, 0, 1] }}
                    transition={{ duration: 2, repeat: Infinity }}
                  />
                )}
              </div>
              <span
                className={cn(
                  'font-body text-[10px] font-medium uppercase tracking-wide',
                  active ? 'text-accent' : done ? 'text-textSecondary' : 'text-textMuted'
                )}
              >
                {label}
              </span>
            </div>
            {i < STEPS.length - 1 && (
              <div
                className={cn(
                  'h-0.5 w-16 sm:w-24 mx-3 mb-5 rounded-full transition-all duration-300',
                  step > idx ? 'bg-accent' : 'bg-border'
                )}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}

// ── Address form ───────────────────────────────────────────────────────────────

function FormField({ label, error, ...props }) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="font-body text-xs font-semibold text-textSecondary">{label}</label>
      <input
        className={cn(
          'w-full px-4 py-3 rounded-xl bg-surface border font-body text-sm text-textPrimary placeholder:text-textMuted outline-none transition-colors duration-200',
          error ? 'border-red-400 focus:border-red-500' : 'border-border focus:border-accent'
        )}
        {...props}
      />
      {error && <p className="font-body text-xs text-red-500">{error}</p>}
    </div>
  );
}

function AddressStep({ savedAddresses, onContinue }) {
  const [selected, setSelected] = useState(
    savedAddresses?.findIndex((a) => a.isDefault) ?? -1
  );
  const [showForm, setShowForm] = useState(!savedAddresses?.length);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm({ resolver: zodResolver(addressSchema) });

  const handleContinue = handleSubmit((formData) => {
    let address;
    if (showForm || selected === -1) {
      address = formData;
    } else {
      const a = savedAddresses[selected];
      address = {
        name: a.label || 'Home',
        phone: a.phone || '',
        street: a.street,
        city: a.city,
        state: a.state,
        pincode: a.pincode,
      };
    }
    onContinue(address);
  });

  const proceedWithSaved = () => {
    if (selected === -1) {
      toast.error('Please select or add an address');
      return;
    }
    const a = savedAddresses[selected];
    onContinue({
      name: a.label || 'Home',
      phone: a.phone || '',
      street: a.street,
      city: a.city,
      state: a.state,
      pincode: a.pincode,
    });
  };

  return (
    <motion.div
      initial={{ opacity: 0, x: 30 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -30 }}
      transition={{ duration: 0.3, ease: 'easeOut' }}
    >
      <h2 className="font-display text-xl text-textPrimary mb-5 flex items-center gap-2">
        <MapPin size={18} className="text-accent" strokeWidth={1.8} />
        Delivery Address
      </h2>

      {/* Saved address cards */}
      {savedAddresses?.length > 0 && (
        <div className="space-y-3 mb-5">
          {savedAddresses.map((addr, i) => (
            <motion.div
              key={addr._id || i}
              whileHover={{ scale: 1.005 }}
              onClick={() => { setSelected(i); setShowForm(false); }}
              className={cn(
                'relative p-4 rounded-2xl border-2 cursor-pointer transition-all duration-200',
                selected === i ? 'border-accent bg-accent/5' : 'border-border hover:border-accent/50'
              )}
            >
              {selected === i && (
                <div className="absolute top-3 right-3 w-5 h-5 rounded-full bg-accent flex items-center justify-center">
                  <Check size={11} strokeWidth={3} className="text-white" />
                </div>
              )}
              <p className="font-body text-xs font-bold uppercase tracking-widest text-accent mb-1">
                {addr.label || 'Address'}
              </p>
              <p className="font-body text-sm text-textPrimary leading-relaxed">
                {addr.street}, {addr.city}, {addr.state} — {addr.pincode}
              </p>
            </motion.div>
          ))}
        </div>
      )}

      {/* Add new toggle */}
      <button
        type="button"
        onClick={() => setShowForm((v) => !v)}
        className="mb-4 font-body text-sm text-accent hover:underline flex items-center gap-1"
      >
        {showForm ? '− Use saved address' : '+ Add new address'}
      </button>

      {/* New address form */}
      <AnimatePresence>
        {showForm && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3, ease: 'easeInOut' }}
            className="overflow-hidden"
          >
            <form onSubmit={handleContinue} className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-5">
              <FormField label="Full Name" placeholder="Recipient name" error={errors.name?.message} {...register('name')} />
              <FormField label="Phone" type="tel" placeholder="10-digit number" error={errors.phone?.message} {...register('phone')} />
              <FormField label="Street Address" placeholder="House no., area, street" error={errors.street?.message} className="sm:col-span-2" {...register('street')} />
              <FormField label="City" placeholder="City" error={errors.city?.message} {...register('city')} />
              <FormField label="State" placeholder="State" error={errors.state?.message} {...register('state')} />
              <FormField label="Pincode" placeholder="6-digit pincode" error={errors.pincode?.message} {...register('pincode')} />
              <div className="sm:col-span-2">
                <motion.button
                  type="submit"
                  whileHover={{ scale: 1.01 }}
                  whileTap={{ scale: 0.99 }}
                  className="w-full py-3.5 rounded-xl bg-accent text-white font-body font-semibold hover:bg-orange-600 transition-colors duration-200"
                >
                  Continue to Payment →
                </motion.button>
              </div>
            </form>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Continue with saved address */}
      {!showForm && savedAddresses?.length > 0 && (
        <motion.button
          whileHover={{ scale: 1.01 }}
          whileTap={{ scale: 0.99 }}
          onClick={proceedWithSaved}
          className="w-full py-3.5 rounded-xl bg-accent text-white font-body font-semibold hover:bg-orange-600 transition-colors duration-200"
        >
          Continue to Payment →
        </motion.button>
      )}
    </motion.div>
  );
}

// ── Payment Step ───────────────────────────────────────────────────────────────

function PaymentStep({ cartItems, subtotal, onBack, onPlaceOrder, isPlacing }) {
  const [method, setMethod] = useState('cod');
  const [couponInput, setCouponInput] = useState('');
  const [couponResult, setCouponResult] = useState(null);
  const [couponLoading, setCouponLoading] = useState(false);
  const [couponError, setCouponError] = useState('');

  const handleApplyCoupon = async () => {
    if (!couponInput.trim()) return;
    setCouponLoading(true);
    setCouponError('');
    try {
      const res = await api.post('/coupons/validate', {
        code: couponInput.toUpperCase(),
        cartTotal: subtotal,
      });
      setCouponResult(res.data.data);
      toast.success(`Coupon applied! You save ${formatPrice(res.data.data.discountAmount)}`);
    } catch (err) {
      setCouponError(err.response?.data?.message || 'Invalid coupon code');
    } finally {
      setCouponLoading(false);
    }
  };

  const removeCoupon = () => {
    setCouponResult(null);
    setCouponInput('');
    setCouponError('');
  };

  return (
    <motion.div
      initial={{ opacity: 0, x: 30 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -30 }}
      transition={{ duration: 0.3, ease: 'easeOut' }}
    >
      <h2 className="font-display text-xl text-textPrimary mb-5 flex items-center gap-2">
        <CreditCard size={18} className="text-accent" strokeWidth={1.8} />
        Payment Method
      </h2>

      {/* Payment options */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-6">
        {[
          {
            value: 'cod',
            icon: Banknote,
            title: 'Cash on Delivery',
            sub: 'Pay when delivered',
            detail: 'Available across India',
          },
          {
            value: 'paytm',
            icon: CreditCard,
            title: 'Paytm / Online',
            sub: 'Pay securely online',
            detail: 'UPI, Cards, Netbanking',
          },
        ].map((opt) => (
          <motion.button
            key={opt.value}
            type="button"
            whileHover={{ scale: 1.01 }}
            whileTap={{ scale: 0.99 }}
            onClick={() => setMethod(opt.value)}
            className={cn(
              'relative p-4 rounded-2xl border-2 text-left transition-all duration-200',
              method === opt.value
                ? 'border-accent bg-accent/8'
                : 'border-border hover:border-accent/50'
            )}
          >
            {method === opt.value && (
              <div className="absolute top-3 right-3 w-5 h-5 rounded-full bg-accent flex items-center justify-center">
                <Check size={11} strokeWidth={3} className="text-white" />
              </div>
            )}
            <opt.icon size={22} className="text-accent mb-2.5" strokeWidth={1.6} />
            <p className="font-body font-semibold text-sm text-textPrimary">{opt.title}</p>
            <p className="font-body text-xs text-textSecondary mt-0.5">{opt.sub}</p>
            <p className="font-body text-[10px] text-textMuted mt-0.5">{opt.detail}</p>
          </motion.button>
        ))}
      </div>

      {/* Coupon section */}
      <div className="mb-6">
        <p className="font-body text-xs font-semibold text-textSecondary uppercase tracking-widest mb-2.5">
          Coupon Code
        </p>
        {couponResult ? (
          <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-accent3/8 border border-accent3/25">
            <Check size={15} className="text-accent3 shrink-0" strokeWidth={2.5} />
            <div className="flex-1">
              <p className="font-mono text-sm font-semibold text-textPrimary">{couponResult.coupon.code}</p>
              <p className="font-body text-xs text-accent3">You save {formatPrice(couponResult.discountAmount)}</p>
            </div>
            <button onClick={removeCoupon} className="p-1 text-textMuted hover:text-red-500 transition-colors">
              <X size={14} strokeWidth={2} />
            </button>
          </div>
        ) : (
          <div className="space-y-1.5">
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Tag size={13} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-textMuted" strokeWidth={1.8} />
                <input
                  value={couponInput}
                  onChange={(e) => { setCouponInput(e.target.value.toUpperCase()); setCouponError(''); }}
                  onKeyDown={(e) => e.key === 'Enter' && handleApplyCoupon()}
                  placeholder="COUPON CODE"
                  className={cn(
                    'w-full pl-9 pr-3 py-3 rounded-xl bg-surface border font-mono text-xs text-textPrimary placeholder:text-textMuted outline-none transition-colors',
                    couponError ? 'border-red-400' : 'border-border focus:border-accent'
                  )}
                />
              </div>
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.97 }}
                onClick={handleApplyCoupon}
                disabled={!couponInput || couponLoading}
                className="px-4 py-3 rounded-xl border border-border font-body text-sm text-textSecondary hover:border-accent hover:text-accent transition-all duration-200 disabled:opacity-40 shrink-0"
              >
                {couponLoading ? '…' : 'Apply'}
              </motion.button>
            </div>
            {couponError && <p className="font-body text-xs text-red-500 pl-1">{couponError}</p>}
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="flex gap-3">
        <button
          onClick={onBack}
          className="flex items-center gap-1.5 px-4 py-3.5 rounded-xl border border-border font-body text-sm text-textSecondary hover:border-accent hover:text-accent transition-all duration-200"
        >
          <ChevronLeft size={15} strokeWidth={2} />
          Back
        </button>
        <motion.button
          whileHover={{ scale: 1.01 }}
          whileTap={{ scale: 0.99 }}
          disabled={isPlacing}
          onClick={() => onPlaceOrder(method, couponResult?.coupon?.code)}
          className="flex-1 py-3.5 rounded-xl bg-accent text-white font-body font-semibold hover:bg-orange-600 transition-colors duration-200 disabled:opacity-55"
        >
          {isPlacing ? 'Placing Order…' : `Place Order${method === 'cod' ? ' (COD)' : ' & Pay'}`}
        </motion.button>
      </div>
    </motion.div>
  );
}

// ── Order Summary Sidebar ──────────────────────────────────────────────────────

function OrderSummary({ cartData, couponDiscount }) {
  const items = cartData?.items || [];
  const subtotal = items.reduce((s, i) => s + i.price * i.quantity, 0);
  const discount = couponDiscount || 0;
  const shipping = subtotal - discount >= 999 ? 0 : 99;
  const total = subtotal - discount + shipping;

  return (
    <div className="bg-surface rounded-2xl border border-border p-5 h-fit sticky top-24">
      <h3 className="font-display text-lg text-textPrimary mb-4 flex items-center gap-2">
        <ShoppingBag size={16} className="text-accent" strokeWidth={1.8} />
        Order Summary
        <span className="font-body text-sm text-textSecondary font-normal">({items.length} item{items.length !== 1 ? 's' : ''})</span>
      </h3>

      {/* Item list */}
      <div className="space-y-3 mb-4 max-h-52 overflow-y-auto pr-1">
        {items.map((item, i) => {
          const img = item.product?.images?.[0]?.url || item.image;
          const name = item.product?.name || item.name || 'Product';
          return (
            <div key={i} className="flex gap-3">
              <div className="w-14 h-14 rounded-xl bg-surface2 border border-border overflow-hidden shrink-0">
                {img && <img src={img} alt={name} className="w-full h-full object-cover" />}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-body text-xs text-textPrimary line-clamp-1 leading-tight">{name}</p>
                <p className="font-body text-[10px] text-textMuted">Size {item.size} · Qty {item.quantity}</p>
                <p className="font-mono text-xs text-accent font-semibold mt-0.5">{formatPrice(item.price * item.quantity)}</p>
              </div>
            </div>
          );
        })}
      </div>

      <div className="border-t border-border pt-3 space-y-2">
        <div className="flex justify-between font-body text-sm">
          <span className="text-textSecondary">Subtotal</span>
          <span className="text-textPrimary">{formatPrice(subtotal)}</span>
        </div>
        {discount > 0 && (
          <div className="flex justify-between font-body text-sm">
            <span className="text-textSecondary">Discount</span>
            <span className="text-accent3">−{formatPrice(discount)}</span>
          </div>
        )}
        <div className="flex justify-between font-body text-sm">
          <span className="text-textSecondary">Shipping</span>
          <span className={shipping === 0 ? 'text-accent3' : 'text-textPrimary'}>
            {shipping === 0 ? 'FREE' : formatPrice(shipping)}
          </span>
        </div>
        <div className="flex justify-between font-display text-base pt-2 border-t border-border">
          <span className="text-textPrimary">Total</span>
          <span className="text-textPrimary font-bold">{formatPrice(total)}</span>
        </div>
      </div>
    </div>
  );
}

// ── Main page ──────────────────────────────────────────────────────────────────

export default function CheckoutPage() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { user } = useSelector((s) => s.auth);

  const [step, setStep] = useState(1);
  const [shippingAddress, setShippingAddress] = useState(null);
  const [couponDiscount, setCouponDiscount] = useState(0);
  const [isPlacing, setIsPlacing] = useState(false);

  // Fetch cart
  const { data: cartData, isLoading: cartLoading } = useQuery({
    queryKey: ['checkout-cart'],
    queryFn: () => api.get('/cart').then((r) => r.data.data),
  });

  // Fetch profile (for saved addresses)
  const { data: profileData } = useQuery({
    queryKey: ['checkout-profile'],
    queryFn: () => api.get('/users/profile').then((r) => r.data.data),
  });

  const cartItems = cartData?.items || [];
  const subtotal = cartItems.reduce((s, i) => s + i.price * i.quantity, 0);
  const savedAddresses = profileData?.user?.addresses || [];

  const handleAddressDone = (address) => {
    setShippingAddress(address);
    setStep(2);
  };

  const handlePlaceOrder = async (paymentMethod, couponCode) => {
    if (!shippingAddress) { toast.error('No shipping address'); return; }
    if (!cartItems.length) { toast.error('Your cart is empty'); return; }

    setIsPlacing(true);
    try {
      const orderPayload = {
        items: cartItems.map((item) => ({
          productId: typeof item.product === 'object' ? item.product._id : item.product,
          size: item.size,
          quantity: item.quantity,
        })),
        shippingAddress,
        paymentMethod,
        ...(couponCode && { couponCode }),
      };

      const orderRes = await api.post('/orders', orderPayload);
      const order = orderRes.data.data.order;

      dispatch(clearCart());

      if (paymentMethod === 'cod') {
        navigate(`/order-success/${order._id}`);
      } else {
        // Paytm: initiate transaction
        try {
          const paytmRes = await api.post('/payment/paytm/initiate', { orderId: order._id });
          toast.info('Paytm integration: use txnToken in Paytm JS SDK to open checkout.');
          navigate(`/order-success/${order._id}`);
        } catch {
          toast.info('Order placed. Complete payment on the order page.');
          navigate(`/order-success/${order._id}`);
        }
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Could not place order. Try again.');
    } finally {
      setIsPlacing(false);
    }
  };

  if (cartLoading) {
    return (
      <div className="max-w-5xl mx-auto px-5 py-10 grid grid-cols-1 lg:grid-cols-[1fr_340px] gap-8">
        <div className="space-y-4">
          {[1, 2, 3].map((i) => <Skeleton key={i} height={72} width="100%" rounded="rounded-2xl" />)}
        </div>
        <Skeleton height={320} width="100%" rounded="rounded-2xl" />
      </div>
    );
  }

  if (!cartItems.length) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center gap-4 px-5">
        <ShoppingBag size={40} className="text-textMuted" strokeWidth={1.5} />
        <p className="font-display text-2xl text-textPrimary">Your cart is empty</p>
        <button
          onClick={() => navigate('/shop')}
          className="px-6 py-2.5 rounded-xl bg-accent text-white font-body font-semibold hover:bg-orange-600 transition-colors"
        >
          Browse Shoes
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <StepIndicator step={step} />

      <div className="max-w-5xl mx-auto px-5 py-8 grid grid-cols-1 lg:grid-cols-[1fr_340px] gap-8 items-start">
        {/* Step content */}
        <div>
          <AnimatePresence mode="wait">
            {step === 1 && (
              <AddressStep
                key="address"
                savedAddresses={savedAddresses}
                onContinue={handleAddressDone}
              />
            )}
            {step === 2 && (
              <PaymentStep
                key="payment"
                cartItems={cartItems}
                subtotal={subtotal}
                onBack={() => setStep(1)}
                onPlaceOrder={handlePlaceOrder}
                isPlacing={isPlacing}
              />
            )}
          </AnimatePresence>
        </div>

        {/* Order summary — always visible */}
        <OrderSummary cartData={cartData} couponDiscount={couponDiscount} />
      </div>
    </div>
  );
}
