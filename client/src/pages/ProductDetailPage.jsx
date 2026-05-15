import { useState, useRef } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import { useSelector, useDispatch } from 'react-redux';
import {
  Home, ChevronRight, Star, ShoppingBag, Zap, ChevronDown,
  Minus, Plus, Check, X, AlertCircle,
} from 'lucide-react';
import { StarRating, Modal, Skeleton, Badge, ProductCard, gridContainerVariants, gridItemVariants } from '../components/ui';
import api from '../lib/axios';
import { toast } from '../lib/toast';
import { setCart, toggleCart } from '../store/cartSlice';
import { formatPrice, formatDate, getDiscountPercent, cn } from '../lib/utils';

// ── Accordion (custom animated) ────────────────────────────────────────────────

function AccordionItem({ title, children, defaultOpen = false }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="border-b border-border last:border-b-0">
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex items-center justify-between w-full py-4 text-left"
      >
        <span className="font-body font-medium text-sm text-textPrimary">{title}</span>
        <ChevronDown
          size={15}
          strokeWidth={2}
          className={cn('text-textSecondary shrink-0 transition-transform duration-200', open && 'rotate-180')}
        />
      </button>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25, ease: 'easeInOut' }}
            className="overflow-hidden"
          >
            <div className="pb-4 font-body text-sm text-textSecondary leading-relaxed">
              {children}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ── Image Gallery ──────────────────────────────────────────────────────────────

function ImageGallery({ images = [], discountLabel }) {
  const [selected, setSelected] = useState(0);
  const safeImages = images.length > 0
    ? images
    : [{ url: 'https://placehold.co/600x600/f5f4f0/c8c4be?text=No+Image', publicId: 'placeholder' }];

  return (
    <div className="flex flex-col gap-3">
      {/* Main image */}
      <div className="relative aspect-square rounded-2xl overflow-hidden bg-surface">
        <AnimatePresence mode="wait">
          <motion.img
            key={selected}
            src={safeImages[selected]?.url}
            alt="Product"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
            className="w-full h-full object-cover"
          />
        </AnimatePresence>

        {discountLabel && (
          <div className="absolute top-4 left-4 z-10">
            <Badge variant="accent">{discountLabel}</Badge>
          </div>
        )}
      </div>

      {/* Thumbnails */}
      {safeImages.length > 1 && (
        <div className="flex gap-2">
          {safeImages.slice(0, 4).map((img, i) => (
            <motion.button
              key={img.publicId || i}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => setSelected(i)}
              className={cn(
                'relative w-16 h-16 rounded-xl overflow-hidden border-2 flex-shrink-0 transition-all duration-200',
                selected === i ? 'border-accent' : 'border-border hover:border-accent/50'
              )}
            >
              <img src={img.url} alt="" className="w-full h-full object-cover" />
            </motion.button>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Size Selector ──────────────────────────────────────────────────────────────

function SizeSelector({ sizes = [], selected, onSelect, shake }) {
  return (
    <div>
      <p className="font-body text-[10px] uppercase tracking-[0.18em] text-textMuted mb-3">
        Select Size
        {selected && (
          <span className="ml-2 text-accent font-semibold normal-case tracking-normal">UK {selected}</span>
        )}
      </p>
      <motion.div
        animate={shake ? { x: [0, -8, 8, -6, 6, -4, 4, 0] } : { x: 0 }}
        transition={{ duration: 0.45 }}
        className="grid grid-cols-6 gap-2"
      >
        {sizes.map(({ size, stock }) => {
          const isSelected = selected === size;
          const outOfStock = stock === 0;
          return (
            <motion.button
              key={size}
              whileHover={!outOfStock ? { scale: 1.05 } : {}}
              whileTap={!outOfStock ? { scale: 0.95 } : {}}
              onClick={() => !outOfStock && onSelect(size)}
              disabled={outOfStock}
              className={cn(
                'py-2.5 rounded-xl border font-mono text-xs font-medium transition-all duration-200',
                isSelected
                  ? 'bg-accent border-accent text-white'
                  : outOfStock
                  ? 'border-border text-textMuted opacity-40 cursor-not-allowed line-through'
                  : 'border-border text-textPrimary hover:border-accent hover:text-accent'
              )}
            >
              {size}
            </motion.button>
          );
        })}
      </motion.div>
    </div>
  );
}

// ── Review Card ────────────────────────────────────────────────────────────────

function ReviewCard({ review }) {
  return (
    <div className="bg-surface rounded-2xl border border-border p-5 flex flex-col gap-3">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-full bg-accent/12 border border-accent/20 flex items-center justify-center shrink-0">
            <span className="font-display text-sm text-accent font-bold">
              {review.user?.name?.charAt(0) || '?'}
            </span>
          </div>
          <div>
            <p className="font-body text-sm font-semibold text-textPrimary leading-tight">
              {review.user?.name || 'User'}
            </p>
            <p className="font-body text-[10px] text-textMuted">{formatDate(review.createdAt)}</p>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <StarRating rating={review.rating} size={13} />
          {review.isVerifiedPurchase && (
            <Badge variant="success">Verified</Badge>
          )}
        </div>
      </div>

      {review.title && (
        <p className="font-body text-sm font-semibold text-textPrimary">{review.title}</p>
      )}
      {review.comment && (
        <p className="font-body text-sm text-textSecondary leading-relaxed">{review.comment}</p>
      )}
    </div>
  );
}

// ── Rating Summary ─────────────────────────────────────────────────────────────

function RatingSummary({ average, count, reviews = [] }) {
  const breakdown = [5, 4, 3, 2, 1].map((star) => {
    const n = reviews.filter((r) => r.rating === star).length;
    return { star, count: n, pct: reviews.length > 0 ? (n / reviews.length) * 100 : 0 };
  });

  return (
    <div className="flex flex-col sm:flex-row gap-6 items-start">
      {/* Big number */}
      <div className="flex flex-col items-center gap-1 text-center min-w-[80px]">
        <span className="font-display text-6xl font-bold text-textPrimary leading-none">
          {Number(average).toFixed(1)}
        </span>
        <StarRating rating={average} size={16} />
        <span className="font-body text-xs text-textMuted">{count} review{count !== 1 ? 's' : ''}</span>
      </div>

      {/* Bars */}
      <div className="flex-1 w-full space-y-1.5">
        {breakdown.map(({ star, count: n, pct }) => (
          <div key={star} className="flex items-center gap-2">
            <span className="font-mono text-xs text-textSecondary w-3 text-right">{star}</span>
            <Star size={11} className="text-gold shrink-0" style={{ fill: 'currentColor' }} strokeWidth={0} />
            <div className="flex-1 h-1.5 bg-surface2 rounded-full overflow-hidden">
              <motion.div
                className="h-full bg-accent rounded-full"
                initial={{ width: 0 }}
                whileInView={{ width: `${pct}%` }}
                viewport={{ once: true }}
                transition={{ duration: 0.8, delay: (5 - star) * 0.08, ease: 'easeOut' }}
              />
            </div>
            <span className="font-body text-xs text-textMuted w-6 text-right">{n}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Write Review Modal ─────────────────────────────────────────────────────────

function WriteReviewModal({ open, onClose, productId, onSuccess }) {
  const [rating, setRating] = useState(0);
  const [title, setTitle] = useState('');
  const [comment, setComment] = useState('');
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: () =>
      api.post(`/reviews/products/${productId}`, { rating, title, comment }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reviews', productId] });
      toast.success('Review submitted!');
      onSuccess?.();
      onClose();
    },
    onError: (err) => {
      toast.error(err.response?.data?.message || 'Could not submit review');
    },
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!rating) { toast.error('Please select a rating'); return; }
    mutation.mutate();
  };

  return (
    <Modal open={open} onClose={onClose} title="Write a Review" size="md">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <p className="font-body text-xs text-textMuted uppercase tracking-widest mb-2">Your Rating</p>
          <StarRating rating={rating} size={28} interactive onChange={setRating} />
        </div>

        <div>
          <label className="font-body text-xs text-textMuted uppercase tracking-widest block mb-1.5">
            Title
          </label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Summarise your experience"
            className="w-full px-4 py-2.5 rounded-xl bg-surface border border-border font-body text-sm text-textPrimary placeholder:text-textMuted outline-none focus:border-accent transition-colors duration-200"
          />
        </div>

        <div>
          <label className="font-body text-xs text-textMuted uppercase tracking-widest block mb-1.5">
            Review
          </label>
          <textarea
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            placeholder="What did you love (or not) about this product?"
            rows={4}
            className="w-full px-4 py-2.5 rounded-xl bg-surface border border-border font-body text-sm text-textPrimary placeholder:text-textMuted outline-none focus:border-accent transition-colors duration-200 resize-none"
          />
        </div>

        <motion.button
          type="submit"
          disabled={mutation.isPending || !rating}
          whileHover={{ scale: 1.01 }}
          whileTap={{ scale: 0.99 }}
          className="w-full py-3 rounded-xl bg-accent text-white font-body font-semibold text-sm hover:bg-orange-600 transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {mutation.isPending ? 'Submitting…' : 'Submit Review'}
        </motion.button>
      </form>
    </Modal>
  );
}

// ── Reviews Section ────────────────────────────────────────────────────────────

function ReviewsSection({ productId }) {
  const { isAuthenticated } = useSelector((s) => s.auth);
  const [reviewModalOpen, setReviewModalOpen] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ['reviews', productId],
    queryFn: () =>
      api.get(`/reviews/products/${productId}`, { params: { limit: 50 } })
         .then((r) => r.data.data),
    enabled: !!productId,
  });

  const reviews = data?.reviews || [];
  const average = data?.averageRating || 0;
  const count = data?.ratingCount || data?.totalCount || 0;

  return (
    <section id="reviews" className="pt-12 border-t border-border">
      <div className="flex items-center justify-between mb-8">
        <h2 className="font-display text-2xl text-textPrimary">Customer Reviews</h2>
        {isAuthenticated && (
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => setReviewModalOpen(true)}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl border border-border font-body text-sm font-medium text-textSecondary hover:border-accent hover:text-accent transition-all duration-200"
          >
            <Star size={14} strokeWidth={1.8} />
            Write a Review
          </motion.button>
        )}
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="flex gap-4 p-4 rounded-2xl border border-border">
              <Skeleton width={36} height={36} rounded="rounded-full" />
              <div className="flex-1 space-y-2">
                <Skeleton height={12} width="30%" />
                <Skeleton height={11} width="60%" />
              </div>
            </div>
          ))}
        </div>
      ) : reviews.length === 0 ? (
        <div className="text-center py-12">
          <p className="font-body text-textSecondary mb-1">No reviews yet.</p>
          {isAuthenticated && (
            <button
              onClick={() => setReviewModalOpen(true)}
              className="font-body text-sm text-accent hover:underline"
            >
              Be the first to review!
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* Rating summary left */}
          <div>
            <RatingSummary average={average} count={count} reviews={reviews} />
          </div>

          {/* Review cards right */}
          <div className="space-y-3 max-h-[480px] overflow-y-auto pr-1">
            {reviews.map((r) => (
              <ReviewCard key={r._id} review={r} />
            ))}
          </div>
        </div>
      )}

      <WriteReviewModal
        open={reviewModalOpen}
        onClose={() => setReviewModalOpen(false)}
        productId={productId}
      />
    </section>
  );
}

// ── Related Products ───────────────────────────────────────────────────────────

function RelatedProducts({ category, excludeId }) {
  const dispatch = useDispatch();

  const { data } = useQuery({
    queryKey: ['related', category],
    queryFn: () =>
      api.get('/products', { params: { category, limit: 5 } })
         .then((r) => r.data.data),
    enabled: !!category,
  });

  const products = (data?.products || []).filter((p) => p._id !== excludeId).slice(0, 4);

  if (!products.length) return null;

  const handleAdd = async (product) => {
    const size = product.sizes?.find((s) => s.stock > 0)?.size;
    if (!size) { toast.error('Out of stock'); return; }
    try {
      const res = await api.post('/cart/items', { productId: product._id, size, quantity: 1 });
      dispatch(setCart(res.data.data));
      toast.success(`${product.name} added to cart`);
    } catch {
      toast.info('Please sign in to add items to cart');
    }
  };

  return (
    <section className="pt-12 border-t border-border">
      <p className="font-body text-[11px] uppercase tracking-[0.2em] text-accent font-semibold mb-2">
        You May Also Like
      </p>
      <h2 className="font-display text-2xl text-textPrimary mb-7">Related Products</h2>

      <motion.div
        variants={gridContainerVariants}
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, margin: '-60px' }}
        className="grid grid-cols-2 md:grid-cols-4 gap-4"
      >
        {products.map((p) => (
          <motion.div key={p._id} variants={gridItemVariants}>
            <ProductCard product={p} view="grid" onAddToCart={handleAdd} />
          </motion.div>
        ))}
      </motion.div>
    </section>
  );
}

// ── Main Page ──────────────────────────────────────────────────────────────────

export default function ProductDetailPage() {
  const { slug } = useParams();
  const navigate = useNavigate();
  const dispatch = useDispatch();

  // Local state
  const [selectedSize, setSelectedSize] = useState(null);
  const [quantity, setQuantity] = useState(1);
  const [sizeShake, setSizeShake] = useState(false);
  const [cartLoading, setCartLoading] = useState(false);

  // Product query
  const { data: product, isLoading, isError } = useQuery({
    queryKey: ['product', slug],
    queryFn: () => api.get(`/products/slug/${slug}`).then((r) => r.data.data),
  });

  const discount = product ? getDiscountPercent(product.price, product.discountPrice) : null;
  const displayPrice = product?.discountPrice || product?.price;
  const selectedSizeObj = product?.sizes?.find((s) => s.size === selectedSize);
  const maxQty = selectedSizeObj?.stock || 1;

  // Reset size when product changes
  const prevSlug = useRef(slug);
  if (prevSlug.current !== slug) {
    prevSlug.current = slug;
    setSelectedSize(null);
    setQuantity(1);
  }

  const triggerShake = () => {
    setSizeShake(true);
    setTimeout(() => setSizeShake(false), 600);
  };

  const handleAddToCart = async (andCheckout = false) => {
    if (!selectedSize) {
      triggerShake();
      toast.error('Please select a size');
      return;
    }
    setCartLoading(true);
    try {
      const res = await api.post('/cart/items', {
        productId: product._id,
        size: selectedSize,
        quantity,
      });
      dispatch(setCart(res.data.data));
      toast.success(`${product.name} added to cart`);

      if (andCheckout) {
        navigate('/checkout');
      } else {
        dispatch(toggleCart());
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Please sign in to add items to cart');
    } finally {
      setCartLoading(false);
    }
  };

  // ── Loading ──────────────────────────────────────────────────────────────────
  if (isLoading) {
    return (
      <div className="max-w-7xl mx-auto px-5 py-10">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
          <div className="flex flex-col gap-3">
            <Skeleton height={480} width="100%" rounded="rounded-2xl" />
            <div className="flex gap-2">
              {[1, 2, 3, 4].map((i) => <Skeleton key={i} width={64} height={64} rounded="rounded-xl" />)}
            </div>
          </div>
          <div className="space-y-4 pt-2">
            <Skeleton height={12} width="25%" />
            <Skeleton height={32} width="80%" />
            <Skeleton height={14} width="40%" />
            <Skeleton height={24} width="30%" />
            <div className="pt-4 space-y-3">
              <Skeleton height={12} width="20%" />
              <div className="grid grid-cols-6 gap-2">
                {[1,2,3,4,5,6].map(i => <Skeleton key={i} height={44} width="100%" rounded="rounded-xl" />)}
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ── Error ────────────────────────────────────────────────────────────────────
  if (isError || !product) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center gap-4 px-5">
        <AlertCircle size={40} className="text-textMuted" strokeWidth={1.5} />
        <p className="font-display text-2xl text-textPrimary">Product Not Found</p>
        <p className="font-body text-sm text-textSecondary">This product may have been removed or the link is incorrect.</p>
        <Link
          to="/shop"
          className="mt-2 px-6 py-2.5 rounded-xl bg-accent text-white font-body font-semibold text-sm hover:bg-orange-600 transition-colors duration-200"
        >
          Back to Shop
        </Link>
      </div>
    );
  }

  // ── Render ───────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-7xl mx-auto px-5 py-8">
        {/* Breadcrumb */}
        <div className="flex items-center gap-1.5 mb-8">
          <Link to="/" className="flex items-center gap-1 font-body text-xs text-textMuted hover:text-accent transition-colors">
            <Home size={12} strokeWidth={1.8} />Home
          </Link>
          <ChevronRight size={11} className="text-textMuted" strokeWidth={1.5} />
          <Link to="/shop" className="font-body text-xs text-textMuted hover:text-accent transition-colors">Shop</Link>
          <ChevronRight size={11} className="text-textMuted" strokeWidth={1.5} />
          <span className="font-body text-xs text-textSecondary truncate max-w-[200px]">{product.name}</span>
        </div>

        {/* Main 2-col layout */}
        <div className="grid grid-cols-1 md:grid-cols-[55%_1fr] gap-10 mb-16">
          {/* Left: Image Gallery */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5, ease: 'easeOut' }}
          >
            <ImageGallery images={product.images} discountLabel={discount} />
          </motion.div>

          {/* Right: Product Info */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5, ease: 'easeOut' }}
            className="flex flex-col gap-5"
          >
            {/* Brand + Name */}
            <div>
              <p className="font-body text-xs font-bold uppercase tracking-[0.18em] text-accent mb-2">
                {product.brand}
              </p>
              <h1 className="font-display text-3xl text-textPrimary leading-tight mb-3">
                {product.name}
              </h1>

              {/* Rating row */}
              {product.ratings?.count > 0 && (
                <div className="flex items-center gap-2">
                  <StarRating rating={product.ratings.average} count={product.ratings.count} size={15} />
                  <a
                    href="#reviews"
                    onClick={(e) => {
                      e.preventDefault();
                      document.getElementById('reviews')?.scrollIntoView({ behavior: 'smooth' });
                    }}
                    className="font-body text-xs text-accent hover:underline"
                  >
                    {product.ratings.count} review{product.ratings.count !== 1 ? 's' : ''}
                  </a>
                </div>
              )}
            </div>

            {/* Price */}
            <div className="flex items-baseline gap-3">
              <span className="font-mono text-3xl font-bold text-accent">
                {formatPrice(displayPrice)}
              </span>
              {product.discountPrice && (
                <>
                  <span className="font-mono text-base text-textMuted line-through">
                    {formatPrice(product.price)}
                  </span>
                  <Badge variant="purple">{discount}</Badge>
                </>
              )}
            </div>

            <div className="border-t border-border" />

            {/* Size selector */}
            <SizeSelector
              sizes={product.sizes || []}
              selected={selectedSize}
              onSelect={(s) => { setSelectedSize(s); setQuantity(1); }}
              shake={sizeShake}
            />

            {/* Quantity */}
            <div>
              <p className="font-body text-[10px] uppercase tracking-[0.18em] text-textMuted mb-3">
                Quantity
                {selectedSizeObj && (
                  <span className="ml-2 text-accent3 normal-case tracking-normal">
                    ({selectedSizeObj.stock} in stock)
                  </span>
                )}
              </p>
              <div className="flex items-center gap-3 w-fit">
                <motion.button
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.9 }}
                  onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                  disabled={quantity <= 1}
                  className="w-9 h-9 rounded-full border border-border flex items-center justify-center text-textSecondary hover:border-accent hover:text-accent disabled:opacity-30 transition-all duration-200"
                >
                  <Minus size={14} strokeWidth={2.5} />
                </motion.button>
                <span className="font-mono text-lg text-textPrimary w-6 text-center select-none">{quantity}</span>
                <motion.button
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.9 }}
                  onClick={() => setQuantity((q) => Math.min(maxQty, q + 1))}
                  disabled={quantity >= maxQty}
                  className="w-9 h-9 rounded-full border border-border flex items-center justify-center text-textSecondary hover:border-accent hover:text-accent disabled:opacity-30 transition-all duration-200"
                >
                  <Plus size={14} strokeWidth={2.5} />
                </motion.button>
              </div>
            </div>

            {/* CTA Buttons */}
            <div className="flex flex-col gap-2.5">
              <motion.button
                whileHover={{ scale: 1.01 }}
                whileTap={{ scale: 0.99 }}
                onClick={() => handleAddToCart(false)}
                disabled={cartLoading}
                className="w-full flex items-center justify-center gap-2.5 py-4 rounded-xl bg-accent text-white font-body font-semibold text-base hover:bg-orange-600 transition-colors duration-200 disabled:opacity-60"
              >
                <ShoppingBag size={18} strokeWidth={2} />
                {cartLoading ? 'Adding…' : 'Add to Cart'}
              </motion.button>

              <motion.button
                whileHover={{ scale: 1.01 }}
                whileTap={{ scale: 0.99 }}
                onClick={() => handleAddToCart(true)}
                disabled={cartLoading}
                className="w-full flex items-center justify-center gap-2.5 py-4 rounded-xl border-2 border-textPrimary/30 text-textPrimary font-body font-semibold text-base hover:border-textPrimary hover:bg-textPrimary hover:text-background transition-all duration-200 disabled:opacity-60"
              >
                <Zap size={18} strokeWidth={2} />
                Buy Now
              </motion.button>
            </div>

            {/* Accordion: product details */}
            <div className="border-t border-border mt-2">
              <AccordionItem title="Description" defaultOpen>
                {product.description || 'No description available for this product.'}
              </AccordionItem>
              <AccordionItem title="Material & Care">
                {product.material
                  ? `Material: ${product.material}. Clean with a soft, damp cloth. Store in a cool, dry place.`
                  : 'Premium materials used. Clean with a soft damp cloth. Avoid prolonged exposure to water.'}
              </AccordionItem>
              <AccordionItem title="Shipping & Returns">
                Free shipping on orders above ₹999. Standard delivery in 3–5 business days. Easy 7-day
                returns — the product must be unworn and in original packaging.
              </AccordionItem>
            </div>
          </motion.div>
        </div>

        {/* Reviews section */}
        <ReviewsSection productId={product._id} />

        {/* Related products */}
        <div className="mt-16">
          <RelatedProducts category={product.category} excludeId={product._id} />
        </div>
      </div>
    </div>
  );
}
