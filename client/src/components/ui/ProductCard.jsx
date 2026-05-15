import { useState } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Heart, ShoppingBag, Star } from 'lucide-react';
import { cn, formatPrice, getDiscountPercent } from '../../lib/utils';
import StarRating from './StarRating';
import Badge from './Badge';

// Export these so parent grids can use stagger
export const gridContainerVariants = {
  hidden: {},
  visible: {
    transition: { staggerChildren: 0.06 },
  },
};

export const gridItemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { type: 'spring', stiffness: 300, damping: 28 },
  },
};

// ── Grid card ─────────────────────────────────────────────────────────────────

function GridCard({ product, onAddToCart }) {
  const [wishlisted, setWishlisted] = useState(false);
  const [hovered, setHovered] = useState(false);

  const image  = product.images?.[0]?.url || 'https://placehold.co/400x400/f5f4f0/c8c4be?text=No+Image';
  const discount = getDiscountPercent(product.price, product.discountPrice);
  const inStockSizes = product.sizes?.filter((s) => s.stock > 0) ?? [];
  const allSizes = product.sizes ?? [];

  return (
    <motion.div
      variants={gridItemVariants}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      className="group relative flex flex-col bg-background rounded-2xl border border-border overflow-hidden"
      whileHover={{
        boxShadow: '0 16px 48px rgba(26,24,22,0.12)',
      }}
      transition={{ type: 'spring', stiffness: 260, damping: 24 }}
    >
      {/* ── Image area ── */}
      <Link to={`/shop/${product.slug}`} className="relative aspect-square overflow-hidden bg-surface block">
        <motion.img
          src={image}
          alt={product.name}
          className="w-full h-full object-cover"
          animate={{ scale: hovered ? 1.08 : 1 }}
          transition={{ type: 'spring', stiffness: 200, damping: 30 }}
        />

        {/* Discount badge — top left */}
        {discount && (
          <div className="absolute top-3 left-3 z-10">
            <Badge variant="accent">{discount}</Badge>
          </div>
        )}

        {/* Wishlist — top right */}
        <motion.button
          whileHover={{ scale: 1.15 }}
          whileTap={{ scale: 0.85 }}
          transition={{ type: 'spring', stiffness: 500, damping: 20 }}
          onClick={(e) => {
            e.preventDefault();
            setWishlisted((v) => !v);
          }}
          className={cn(
            'absolute top-3 right-3 z-10 p-2 rounded-full backdrop-blur-sm transition-colors',
            wishlisted
              ? 'bg-red-50 text-red-500'
              : 'bg-white/80 text-textSecondary hover:text-red-400'
          )}
        >
          <motion.div
            animate={wishlisted ? { scale: [1, 1.4, 1] } : { scale: 1 }}
            transition={{ duration: 0.3 }}
          >
            <Heart size={16} fill={wishlisted ? 'currentColor' : 'none'} strokeWidth={2} />
          </motion.div>
        </motion.button>

        {/* Quick Add overlay — slides up on hover */}
        <AnimatePresence>
          {hovered && (
            <motion.div
              key="quick-add"
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', stiffness: 360, damping: 30 }}
              className="absolute bottom-0 left-0 right-0 z-10"
            >
              <button
                onClick={(e) => {
                  e.preventDefault();
                  onAddToCart?.(product);
                }}
                className={cn(
                  'w-full flex items-center justify-center gap-2',
                  'bg-accent text-white font-body font-semibold tracking-widest text-xs uppercase',
                  'py-3.5 hover:bg-orange-600 transition-colors'
                )}
              >
                <ShoppingBag size={14} strokeWidth={2.5} />
                Quick Add
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </Link>

      {/* ── Info section ── */}
      <div className="p-3.5 flex flex-col gap-1.5">
        {/* Brand */}
        <p className="font-body text-[10px] font-bold uppercase tracking-widest text-textSecondary">
          {product.brand}
        </p>

        {/* Name */}
        <Link to={`/shop/${product.slug}`}>
          <h3 className="font-display text-sm font-medium text-textPrimary leading-snug line-clamp-2 hover:text-accent transition-colors">
            {product.name}
          </h3>
        </Link>

        {/* Rating */}
        {product.ratings?.count > 0 && (
          <StarRating
            rating={product.ratings.average}
            count={product.ratings.count}
            size={12}
          />
        )}

        {/* Price */}
        <div className="flex items-baseline gap-2 mt-0.5">
          <span className="font-mono text-sm font-semibold text-accent">
            {formatPrice(product.discountPrice || product.price)}
          </span>
          {product.discountPrice && (
            <span className="font-mono text-xs text-textSecondary line-through">
              {formatPrice(product.price)}
            </span>
          )}
        </div>

        {/* Size availability dots */}
        {allSizes.length > 0 && (
          <div className="flex items-center gap-1 mt-1 flex-wrap">
            {allSizes.map(({ size, stock }) => {
              const inStock = stock > 0;
              return (
                <div
                  key={size}
                  title={`Size ${size} — ${inStock ? 'In Stock' : 'Out of Stock'}`}
                  className={cn(
                    'w-5 h-5 rounded-full border text-[9px] font-mono flex items-center justify-center',
                    inStock
                      ? 'bg-accent border-accent text-white'
                      : 'bg-transparent border-border text-textSecondary/40'
                  )}
                >
                  {size}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </motion.div>
  );
}

// ── List card ─────────────────────────────────────────────────────────────────

function ListCard({ product, onAddToCart }) {
  const [wishlisted, setWishlisted] = useState(false);

  const image = product.images?.[0]?.url || 'https://placehold.co/200x200/f5f4f0/c8c4be?text=No+Image';
  const discount = getDiscountPercent(product.price, product.discountPrice);

  return (
    <motion.div
      variants={gridItemVariants}
      whileHover={{ boxShadow: '0 8px 32px rgba(26,24,22,0.10)' }}
      transition={{ type: 'spring', stiffness: 260, damping: 24 }}
      className="flex gap-4 bg-background rounded-2xl border border-border p-3 overflow-hidden"
    >
      {/* Image */}
      <Link to={`/shop/${product.slug}`} className="relative w-28 h-28 shrink-0 rounded-xl overflow-hidden bg-surface block">
        <img src={image} alt={product.name} className="w-full h-full object-cover" />
        {discount && (
          <div className="absolute top-1.5 left-1.5">
            <Badge variant="accent">{discount}</Badge>
          </div>
        )}
      </Link>

      {/* Info */}
      <div className="flex-1 min-w-0 flex flex-col justify-between py-0.5">
        <div>
          <p className="font-body text-[10px] font-bold uppercase tracking-widest text-textSecondary mb-0.5">
            {product.brand}
          </p>
          <Link to={`/shop/${product.slug}`}>
            <h3 className="font-display text-base text-textPrimary leading-snug line-clamp-1 hover:text-accent transition-colors">
              {product.name}
            </h3>
          </Link>
          {product.ratings?.count > 0 && (
            <StarRating rating={product.ratings.average} count={product.ratings.count} size={12} className="mt-1" />
          )}
        </div>

        <div className="flex items-center justify-between">
          <div className="flex items-baseline gap-2">
            <span className="font-mono text-sm font-semibold text-accent">
              {formatPrice(product.discountPrice || product.price)}
            </span>
            {product.discountPrice && (
              <span className="font-mono text-xs text-textSecondary line-through">
                {formatPrice(product.price)}
              </span>
            )}
          </div>

          <div className="flex items-center gap-2">
            <motion.button
              whileHover={{ scale: 1.15 }}
              whileTap={{ scale: 0.85 }}
              onClick={() => setWishlisted((v) => !v)}
              className={cn(
                'p-1.5 rounded-full transition-colors',
                wishlisted ? 'text-red-500' : 'text-textSecondary hover:text-red-400'
              )}
            >
              <Heart size={15} fill={wishlisted ? 'currentColor' : 'none'} strokeWidth={2} />
            </motion.button>

            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => onAddToCart?.(product)}
              className="flex items-center gap-1.5 bg-accent text-white text-xs font-body font-semibold px-3 py-1.5 rounded-lg hover:bg-orange-600 transition-colors"
            >
              <ShoppingBag size={12} />
              Add
            </motion.button>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

// ── Export ────────────────────────────────────────────────────────────────────

export default function ProductCard({ product, view = 'grid', onAddToCart }) {
  if (view === 'list') return <ListCard product={product} onAddToCart={onAddToCart} />;
  return <GridCard product={product} onAddToCart={onAddToCart} />;
}
