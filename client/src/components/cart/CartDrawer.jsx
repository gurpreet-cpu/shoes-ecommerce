import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useSelector, useDispatch } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { X, ShoppingBag, Minus, Plus, Trash2, Tag, Check, ArrowRight } from 'lucide-react';
import { useMutation } from '@tanstack/react-query';
import { toggleCart, setCart } from '../../store/cartSlice';
import { EmptyState } from '../ui';
import { formatPrice, cn } from '../../lib/utils';
import api from '../../lib/axios';

export default function CartDrawer() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { items, isOpen, appliedCoupon } = useSelector((state) => state.cart);
  const [couponInput, setCouponInput] = useState('');
  const [couponError, setCouponError] = useState('');

  const subtotal = items.reduce((sum, item) => sum + (item.price || 0) * (item.quantity || 1), 0);
  const discount = appliedCoupon?.discountAmount || 0;
  const freeShipping = subtotal - discount >= 999;
  const shipping = freeShipping ? 0 : 99;
  const total = subtotal - discount + shipping;
  const totalQty = items.reduce((sum, item) => sum + (item.quantity || 1), 0);
  const amountToFreeShip = 999 - (subtotal - discount);

  const updateQtyMutation = useMutation({
    mutationFn: ({ productId, size, quantity }) =>
      api.put(`/cart/items/${productId}`, { size, quantity }),
    onSuccess: (res) => dispatch(setCart(res.data.data)),
  });

  const removeItemMutation = useMutation({
    mutationFn: ({ productId, size }) =>
      api.delete(`/cart/items/${productId}`, { data: { size } }),
    onSuccess: (res) => dispatch(setCart(res.data.data)),
  });

  const applyCouponMutation = useMutation({
    mutationFn: (code) => api.post('/cart/apply-coupon', { code }),
    onSuccess: (res) => {
      dispatch(setCart(res.data.data));
      setCouponInput('');
      setCouponError('');
    },
    onError: (err) => {
      setCouponError(err.response?.data?.message || 'Invalid or expired coupon');
    },
  });

  const removeCouponMutation = useMutation({
    mutationFn: () => api.delete('/cart/remove-coupon'),
    onSuccess: (res) => dispatch(setCart(res.data.data)),
  });

  const close = () => dispatch(toggleCart());

  const handleCheckout = () => {
    close();
    navigate('/checkout');
  };

  return (
    <>
      {/* Backdrop */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={close}
            className="fixed inset-0 z-[80] bg-textPrimary/25 backdrop-blur-sm"
          />
        )}
      </AnimatePresence>

      {/* Drawer panel */}
      <AnimatePresence>
        {isOpen && (
          <motion.aside
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', stiffness: 360, damping: 38 }}
            className="fixed right-0 top-0 h-full w-full max-w-[420px] z-[90] bg-background border-l border-border flex flex-col shadow-2xl"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-border shrink-0">
              <div className="flex items-center gap-2.5">
                <ShoppingBag size={18} className="text-accent" strokeWidth={1.8} />
                <h2 className="font-display text-lg text-textPrimary">
                  Your Cart
                  {totalQty > 0 && (
                    <span className="font-body text-sm text-textSecondary font-normal ml-1.5">
                      ({totalQty})
                    </span>
                  )}
                </h2>
              </div>
              <motion.button
                whileHover={{ scale: 1.06 }}
                whileTap={{ scale: 0.94 }}
                onClick={close}
                className="p-2 rounded-xl text-textSecondary hover:text-textPrimary hover:bg-surface transition-all duration-200"
              >
                <X size={18} strokeWidth={1.8} />
              </motion.button>
            </div>

            {items.length === 0 ? (
              <div className="flex-1 flex items-center justify-center">
                <EmptyState
                  icon={ShoppingBag}
                  title="Your cart is empty"
                  description="Find the perfect pair and add them here."
                  action={{
                    label: 'Browse Shoes',
                    onClick: () => { close(); navigate('/shop'); },
                  }}
                />
              </div>
            ) : (
              <>
                {/* Items list */}
                <div className="flex-1 overflow-y-auto px-5 py-3">
                  <AnimatePresence initial={false}>
                    {items.map((item) => {
                      const productId = typeof item.product === 'object' ? item.product?._id : item.product;
                      const productName = item.product?.name || item.name || 'Product';
                      const productImage = item.product?.images?.[0]?.url || item.image;

                      return (
                        <CartItem
                          key={`${productId}-${item.size}`}
                          name={productName}
                          image={productImage}
                          size={item.size}
                          price={item.price}
                          quantity={item.quantity}
                          onUpdateQty={(qty) =>
                            updateQtyMutation.mutate({ productId, size: item.size, quantity: qty })
                          }
                          onRemove={() =>
                            removeItemMutation.mutate({ productId, size: item.size })
                          }
                        />
                      );
                    })}
                  </AnimatePresence>
                </div>

                {/* Coupon section */}
                <div className="px-5 py-3.5 border-t border-border shrink-0">
                  {appliedCoupon ? (
                    <div className="flex items-center gap-3 px-3.5 py-2.5 rounded-xl bg-accent3/8 border border-accent3/25">
                      <div className="w-6 h-6 rounded-full bg-accent3/20 flex items-center justify-center shrink-0">
                        <Check size={13} className="text-accent3" strokeWidth={2.5} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-mono text-sm font-semibold text-textPrimary">{appliedCoupon.code}</p>
                        <p className="font-body text-xs text-accent3">
                          −{formatPrice(appliedCoupon.discountAmount)} saved
                        </p>
                      </div>
                      <motion.button
                        whileHover={{ scale: 1.1 }}
                        whileTap={{ scale: 0.9 }}
                        onClick={() => removeCouponMutation.mutate()}
                        disabled={removeCouponMutation.isPending}
                        className="p-1.5 rounded-lg text-textSecondary hover:text-red-500 transition-colors duration-200"
                      >
                        <X size={13} strokeWidth={2.5} />
                      </motion.button>
                    </div>
                  ) : (
                    <div className="space-y-1.5">
                      <div className="flex gap-2">
                        <div className="relative flex-1">
                          <Tag
                            size={13}
                            className="absolute left-3 top-1/2 -translate-y-1/2 text-textMuted"
                            strokeWidth={1.8}
                          />
                          <input
                            type="text"
                            value={couponInput}
                            onChange={(e) => {
                              setCouponInput(e.target.value.toUpperCase());
                              setCouponError('');
                            }}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter' && couponInput) {
                                applyCouponMutation.mutate(couponInput);
                              }
                            }}
                            placeholder="COUPON CODE"
                            className={cn(
                              'w-full pl-9 pr-3 py-2.5 rounded-xl bg-surface border font-mono text-xs text-textPrimary placeholder:text-textMuted outline-none transition-colors duration-200',
                              couponError
                                ? 'border-red-400 focus:border-red-400'
                                : 'border-border focus:border-accent'
                            )}
                          />
                        </div>
                        <motion.button
                          whileHover={{ scale: 1.02 }}
                          whileTap={{ scale: 0.97 }}
                          onClick={() => couponInput && applyCouponMutation.mutate(couponInput)}
                          disabled={!couponInput || applyCouponMutation.isPending}
                          className="px-4 py-2.5 rounded-xl bg-surface border border-border font-body text-sm text-textSecondary hover:border-accent hover:text-accent transition-all duration-200 disabled:opacity-40 disabled:cursor-not-allowed shrink-0"
                        >
                          Apply
                        </motion.button>
                      </div>
                      {couponError && (
                        <p className="font-body text-xs text-red-400 pl-1">{couponError}</p>
                      )}
                    </div>
                  )}
                </div>

                {/* Summary + checkout */}
                <div className="px-5 pt-3 pb-5 border-t border-border shrink-0 space-y-2">
                  <div className="space-y-1.5">
                    <SummaryRow label="Subtotal" value={formatPrice(subtotal)} />
                    {discount > 0 && (
                      <SummaryRow label="Discount" value={`−${formatPrice(discount)}`} accent="green" />
                    )}
                    <SummaryRow
                      label="Shipping"
                      value={freeShipping ? 'FREE' : '₹99'}
                      accent={freeShipping ? 'green' : undefined}
                    />
                    <div className="flex justify-between items-center pt-2 border-t border-border">
                      <span className="font-display text-base text-textPrimary">Total</span>
                      <span className="font-display text-base font-bold text-textPrimary">
                        {formatPrice(total)}
                      </span>
                    </div>
                  </div>

                  {!freeShipping && amountToFreeShip > 0 && (
                    <p className="font-body text-xs text-textMuted text-center">
                      Add{' '}
                      <span className="text-accent font-medium">{formatPrice(amountToFreeShip)}</span>{' '}
                      more for free shipping
                    </p>
                  )}

                  <motion.button
                    whileHover={{ scale: 1.01 }}
                    whileTap={{ scale: 0.99 }}
                    onClick={handleCheckout}
                    className="w-full flex items-center justify-between px-5 py-4 rounded-xl bg-accent text-white font-body font-semibold hover:bg-orange-600 transition-colors duration-200"
                  >
                    <span>Checkout</span>
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-sm">{formatPrice(total)}</span>
                      <ArrowRight size={16} strokeWidth={2} />
                    </div>
                  </motion.button>
                </div>
              </>
            )}
          </motion.aside>
        )}
      </AnimatePresence>
    </>
  );
}

function CartItem({ name, image, size, price, quantity, onUpdateQty, onRemove }) {
  return (
    <motion.div
      layout
      initial={{ opacity: 0, x: 24 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 24, height: 0, marginBottom: 0 }}
      transition={{ type: 'spring', stiffness: 350, damping: 32 }}
      className="flex gap-3.5 p-3 rounded-2xl border border-border bg-surface mb-3 group"
    >
      {/* Image */}
      <div className="w-[76px] h-[76px] rounded-xl bg-surface2 border border-border overflow-hidden shrink-0">
        {image ? (
          <img
            src={image}
            alt={name}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <ShoppingBag size={20} className="text-borderDark" strokeWidth={1.4} />
          </div>
        )}
      </div>

      {/* Details */}
      <div className="flex-1 min-w-0 flex flex-col justify-between">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="font-display text-sm text-textPrimary truncate leading-snug">{name}</p>
            <span className="inline-block mt-1.5 px-2 py-0.5 rounded-md bg-background border border-border font-mono text-[10px] text-textSecondary">
              UK {size}
            </span>
          </div>
          <motion.button
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            onClick={onRemove}
            className="p-1.5 rounded-lg text-textMuted hover:text-red-500 hover:bg-red-50 transition-all duration-200 shrink-0"
          >
            <Trash2 size={13} strokeWidth={1.8} />
          </motion.button>
        </div>

        <div className="flex items-center justify-between">
          <span className="font-mono text-sm text-accent font-semibold">
            {formatPrice(price)}
          </span>
          <div className="flex items-center gap-1.5">
            <motion.button
              whileHover={{ scale: 1.12 }}
              whileTap={{ scale: 0.88 }}
              onClick={() => quantity > 1 && onUpdateQty(quantity - 1)}
              disabled={quantity <= 1}
              className="w-6 h-6 rounded-full border border-border flex items-center justify-center text-textSecondary hover:border-accent hover:text-accent disabled:opacity-30 transition-all duration-200"
            >
              <Minus size={10} strokeWidth={2.5} />
            </motion.button>
            <span className="font-mono text-sm text-textPrimary w-5 text-center select-none">
              {quantity}
            </span>
            <motion.button
              whileHover={{ scale: 1.12 }}
              whileTap={{ scale: 0.88 }}
              onClick={() => onUpdateQty(quantity + 1)}
              className="w-6 h-6 rounded-full border border-border flex items-center justify-center text-textSecondary hover:border-accent hover:text-accent transition-all duration-200"
            >
              <Plus size={10} strokeWidth={2.5} />
            </motion.button>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

function SummaryRow({ label, value, accent }) {
  return (
    <div className="flex justify-between items-center">
      <span className="font-body text-sm text-textSecondary">{label}</span>
      <span
        className={cn(
          'font-body text-sm font-medium',
          accent === 'green' ? 'text-accent3' : 'text-textPrimary'
        )}
      >
        {value}
      </span>
    </div>
  );
}
