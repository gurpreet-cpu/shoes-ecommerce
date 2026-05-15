import { useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { motion, useInView, AnimatePresence } from 'framer-motion';
import CountUp from 'react-countup';
import { ArrowDown, ArrowRight, Check, Mail, Star } from 'lucide-react';
import { useDispatch } from 'react-redux';
import { ProductCard, Skeleton, Badge, gridContainerVariants, gridItemVariants } from '../components/ui';
import api from '../lib/axios';
import { toast } from '../lib/toast';
import { setCart } from '../store/cartSlice';
import heroShoe from '../assets/hero.png';

// ── Animation variants ─────────────────────────────────────────────────────────

const fadeUp = {
  hidden: { opacity: 0, y: 40 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.6, ease: 'easeOut' } },
};

const staggerContainer = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.11 } },
};

// ── Shared components ──────────────────────────────────────────────────────────

function InViewSection({ children, className = '' }) {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: '-80px' });
  return (
    <motion.div
      ref={ref}
      variants={staggerContainer}
      initial="hidden"
      animate={isInView ? 'visible' : 'hidden'}
      className={className}
    >
      {children}
    </motion.div>
  );
}

function SectionLabel({ children }) {
  return (
    <motion.p variants={fadeUp} className="font-body text-[11px] uppercase tracking-[0.2em] text-accent font-semibold mb-3">
      {children}
    </motion.p>
  );
}

function SectionHeading({ children }) {
  return (
    <motion.h2 variants={fadeUp} className="font-display text-3xl md:text-4xl text-textPrimary mb-10">
      {children}
    </motion.h2>
  );
}

// ── 1. HERO ────────────────────────────────────────────────────────────────────

const HERO_WORDS = ['STEP', 'INTO YOUR', 'NEXT CHAPTER'];

function FloatingCard({ emoji, label, sub, posClass, delay }) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.8, y: 10 }}
      animate={{ opacity: 1, scale: 1, y: [0, -10, 0] }}
      transition={{
        opacity: { delay, duration: 0.4, ease: 'easeOut' },
        scale: { delay, duration: 0.4, ease: 'easeOut' },
        y: { delay: delay + 0.5, duration: 3.2, repeat: Infinity, ease: 'easeInOut' },
      }}
      className={`absolute flex items-center gap-2.5 bg-background/90 backdrop-blur-sm border border-border rounded-2xl px-3.5 py-2.5 shadow-md ${posClass}`}
    >
      <span className="text-xl leading-none">{emoji}</span>
      <div>
        <p className="font-display text-xs text-textPrimary font-semibold leading-tight">{label}</p>
        <p className="font-body text-[10px] text-textSecondary leading-tight">{sub}</p>
      </div>
    </motion.div>
  );
}

function HeroSection() {
  return (
    <section className="relative min-h-screen flex items-center overflow-hidden bg-background">
      {/* Warm radial glow */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_70%_60%_at_70%_40%,rgba(255,107,53,0.07)_0%,transparent_70%)] pointer-events-none" />

      <div className="relative max-w-7xl mx-auto px-5 w-full pt-24 pb-16">
        <div className="grid grid-cols-1 md:grid-cols-5 gap-12 md:gap-4 items-center">

          {/* Left — text (col-span 3, 60%) */}
          <div className="md:col-span-3 flex flex-col order-2 md:order-1">
            {/* Pill badge */}
            <motion.div
              initial={{ opacity: 0, y: -18, scale: 0.88 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{ type: 'spring', stiffness: 280, damping: 22, delay: 0.15 }}
              className="inline-flex items-center gap-2 self-start mb-7 px-4 py-2 rounded-full bg-accent/10 border border-accent/25 text-accent font-body text-[11px] font-bold uppercase tracking-widest"
            >
              <span>✦</span> New Arrivals 2025
            </motion.div>

            {/* Headline — staggered words */}
            <motion.div
              variants={staggerContainer}
              initial="hidden"
              animate="visible"
              className="mb-7 overflow-hidden"
            >
              {HERO_WORDS.map((word, i) => (
                <motion.div
                  key={i}
                  variants={{
                    hidden: { opacity: 0, y: 60 },
                    visible: {
                      opacity: 1, y: 0,
                      transition: { type: 'spring', stiffness: 250, damping: 26, delay: i * 0.1 },
                    },
                  }}
                >
                  <h1 className="font-display font-bold leading-[0.88] tracking-tight text-textPrimary"
                    style={{ fontSize: 'clamp(3rem, 9vw, 6.5rem)' }}
                  >
                    {word}
                  </h1>
                </motion.div>
              ))}
            </motion.div>

            {/* Subtext */}
            <motion.p
              initial={{ opacity: 0, y: 18 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.55, duration: 0.6, ease: 'easeOut' }}
              className="font-body text-base md:text-lg text-textSecondary max-w-sm leading-relaxed mb-9"
            >
              Premium shoes for every journey.
              Crafted for comfort, designed for style.
            </motion.p>

            {/* CTA buttons */}
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.7, duration: 0.55, ease: 'easeOut' }}
              className="flex flex-wrap gap-3"
            >
              <Link to="/shop">
                <motion.div
                  whileHover={{ scale: 1.03 }}
                  whileTap={{ scale: 0.97 }}
                  className="inline-flex items-center gap-2.5 px-7 py-3.5 rounded-full bg-accent text-white font-body font-semibold tracking-wide hover:bg-orange-600 transition-colors duration-200 cursor-pointer"
                >
                  Shop Now <ArrowRight size={16} strokeWidth={2.2} />
                </motion.div>
              </Link>
              <motion.button
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.97 }}
                className="inline-flex items-center gap-2 px-7 py-3.5 rounded-full border-2 border-textPrimary/30 text-textPrimary font-body font-semibold tracking-wide hover:border-textPrimary hover:bg-textPrimary hover:text-background transition-all duration-200"
              >
                View Lookbook
              </motion.button>
            </motion.div>
          </div>

          {/* Right — shoe image (col-span 2, 40%) */}
          <div className="md:col-span-2 relative flex items-center justify-center min-h-[300px] md:min-h-[500px] order-1 md:order-2">
            {/* Blur glow */}
            <div className="absolute w-[260px] h-[260px] md:w-[380px] md:h-[380px] rounded-full bg-accent/12 blur-[90px]" />

            {/* Floating shoe */}
            <motion.img
              src={heroShoe}
              alt="Hero shoe"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{
                opacity: 1, scale: 1,
                y: [0, -18, 0],
              }}
              transition={{
                opacity: { duration: 0.6, delay: 0.3 },
                scale: { duration: 0.6, delay: 0.3 },
                y: { delay: 1, duration: 3.4, repeat: Infinity, ease: 'easeInOut' },
              }}
              className="relative z-10 w-[240px] md:w-[340px] object-contain drop-shadow-2xl"
            />

            {/* Floating stat cards */}
            <FloatingCard emoji="⭐" label="4.8 Rating" sub="2,400+ reviews" posClass="top-[12%] right-0 md:-right-4 z-20" delay={1.0} />
            <FloatingCard emoji="🚚" label="Free Shipping" sub="Above ₹999" posClass="bottom-[28%] left-0 md:-left-6 z-20" delay={1.2} />
            <FloatingCard emoji="↩" label="Easy Returns" sub="7-day policy" posClass="bottom-[8%] right-2 z-20" delay={1.4} />
          </div>
        </div>
      </div>

      {/* Scroll indicator */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1.8, duration: 0.6 }}
        className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-1.5"
      >
        <span className="font-body text-[9px] uppercase tracking-[0.2em] text-textMuted">Scroll</span>
        <motion.div
          animate={{ y: [0, 6, 0] }}
          transition={{ duration: 1.5, repeat: Infinity, ease: 'easeInOut' }}
        >
          <ArrowDown size={15} className="text-textMuted" strokeWidth={1.8} />
        </motion.div>
      </motion.div>
    </section>
  );
}

// ── 2. MARQUEE STRIP ──────────────────────────────────────────────────────────

const MARQUEE_CONTENT = 'NEW ARRIVALS  •  FREE SHIPPING ABOVE ₹999  •  EASY RETURNS  •  AUTHENTIC PRODUCTS  •  ';

function MarqueeStrip() {
  return (
    <div className="overflow-hidden bg-accent py-3.5">
      <div className="flex animate-marquee whitespace-nowrap">
        {[0, 1].map((i) => (
          <span
            key={i}
            className="shrink-0 font-body font-semibold text-[11px] uppercase tracking-[0.15em] text-white px-2"
          >
            {MARQUEE_CONTENT.repeat(4)}
          </span>
        ))}
      </div>
    </div>
  );
}

// ── 3. CATEGORIES ─────────────────────────────────────────────────────────────

const CATEGORIES = [
  {
    key: 'mens',
    label: "Men's",
    count: '240+ styles',
    to: '/shop?category=mens',
    fromColor: 'from-zinc-900',
    midColor: 'via-zinc-800',
    toColor: 'to-stone-700',
    slideDir: -32,
  },
  {
    key: 'womens',
    label: "Women's",
    count: '180+ styles',
    to: '/shop?category=womens',
    fromColor: 'from-stone-700',
    midColor: 'via-amber-900',
    toColor: 'to-stone-900',
    slideDir: 32,
  },
];

function CategoryCard({ cat, index }) {
  const [hovered, setHovered] = useState(false);

  return (
    <motion.div
      variants={{
        hidden: { opacity: 0, x: cat.slideDir },
        visible: { opacity: 1, x: 0, transition: { duration: 0.65, delay: index * 0.1, ease: 'easeOut' } },
      }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      className="relative aspect-[3/4] overflow-hidden rounded-2xl cursor-pointer"
    >
      {/* Gradient bg */}
      <div className={`absolute inset-0 bg-gradient-to-b ${cat.fromColor} ${cat.midColor} ${cat.toColor}`} />

      {/* Decorative rings */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-8 right-8 w-28 h-28 rounded-full border border-white/10" />
        <div className="absolute top-14 right-14 w-14 h-14 rounded-full border border-white/10" />
        <div className="absolute bottom-24 left-6 w-20 h-20 rounded-full border border-white/8" />
      </div>

      {/* Dark gradient overlay — deepens on hover */}
      <motion.div
        className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/20 to-transparent"
        animate={{ opacity: hovered ? 0.9 : 0.6 }}
        transition={{ duration: 0.3 }}
      />

      {/* Image scale effect (just the gradient shifts) */}
      <motion.div
        className="absolute inset-0"
        animate={{ scale: hovered ? 1.04 : 1 }}
        transition={{ duration: 0.5, ease: 'easeOut' }}
      />

      {/* Text content */}
      <div className="absolute inset-0 flex flex-col justify-end p-7 md:p-8">
        <motion.p
          className="font-body text-[10px] uppercase tracking-[0.2em] text-white/50 mb-2"
          animate={{ y: hovered ? -4 : 0 }}
          transition={{ duration: 0.3 }}
        >
          {cat.count}
        </motion.p>
        <h3 className="font-display text-5xl md:text-6xl font-bold text-white mb-4">{cat.label}</h3>

        <motion.div
          animate={{ opacity: hovered ? 1 : 0, y: hovered ? 0 : 14 }}
          transition={{ duration: 0.25, ease: 'easeOut' }}
        >
          <Link
            to={cat.to}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-white text-textPrimary font-body font-semibold text-sm hover:bg-surface transition-colors duration-200"
          >
            Shop Collection <ArrowRight size={14} strokeWidth={2.2} />
          </Link>
        </motion.div>
      </div>
    </motion.div>
  );
}

function CategoriesSection() {
  return (
    <section className="max-w-7xl mx-auto px-5 py-20">
      <InViewSection>
        <SectionLabel>Shop by Category</SectionLabel>
        <SectionHeading>Find Your Style</SectionHeading>
        <motion.div variants={staggerContainer} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {CATEGORIES.map((cat, i) => (
            <CategoryCard key={cat.key} cat={cat} index={i} />
          ))}
        </motion.div>
      </InViewSection>
    </section>
  );
}

// ── 4. FEATURED PRODUCTS ──────────────────────────────────────────────────────

function ProductCardSkeleton() {
  return (
    <div className="flex flex-col gap-3">
      <Skeleton height={220} width="100%" rounded="rounded-2xl" />
      <Skeleton height={13} width="65%" />
      <Skeleton height={11} width="40%" />
      <Skeleton height={13} width="30%" />
    </div>
  );
}

function FeaturedSection() {
  const dispatch = useDispatch();

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['products', 'featured'],
    queryFn: async () => {
      const res = await api.get('/products/featured');
      return res.data.data;
    },
  });

  const products = Array.isArray(data) ? data : data?.products || [];

  const handleAdd = async (product) => {
    const size = product.sizes?.find((s) => s.stock > 0)?.size;
    if (!size) { toast.error('This product is out of stock'); return; }
    try {
      const res = await api.post('/cart/items', { productId: product._id, size, quantity: 1 });
      dispatch(setCart(res.data.data));
      toast.success(`${product.name} added to cart`);
    } catch {
      toast.info('Please sign in to add items to cart');
    }
  };

  return (
    <section className="max-w-7xl mx-auto px-5 py-20">
      <InViewSection>
        <SectionLabel>Featured</SectionLabel>
        <SectionHeading>Handpicked For You</SectionHeading>
      </InViewSection>

      {isLoading && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => <ProductCardSkeleton key={i} />)}
        </div>
      )}

      {isError && (
        <div className="flex flex-col items-center py-14 gap-4">
          <p className="font-body text-textSecondary text-sm">Couldn't load featured products.</p>
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => refetch()}
            className="px-5 py-2.5 rounded-xl border border-border font-body text-sm text-textSecondary hover:border-accent hover:text-accent transition-all duration-200"
          >
            Try Again
          </motion.button>
        </div>
      )}

      {!isLoading && !isError && products.length > 0 && (
        <>
          <motion.div
            variants={gridContainerVariants}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: '-60px' }}
            className="grid grid-cols-2 md:grid-cols-4 gap-4"
          >
            {products.slice(0, 4).map((p) => (
              <ProductCard key={p._id} product={p} view="grid" onAddToCart={handleAdd} />
            ))}
          </motion.div>

          <div className="flex justify-center mt-10">
            <Link to="/shop">
              <motion.div
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.97 }}
                className="inline-flex items-center gap-2.5 px-9 py-3.5 rounded-full border-2 border-textPrimary/25 text-textPrimary font-body font-semibold tracking-wide hover:border-textPrimary hover:bg-textPrimary hover:text-background transition-all duration-200 cursor-pointer"
              >
                View All Shoes <ArrowRight size={16} strokeWidth={2} />
              </motion.div>
            </Link>
          </div>
        </>
      )}
    </section>
  );
}

// ── 5. STATS STRIP ────────────────────────────────────────────────────────────

const STATS = [
  { end: 10000, suffix: '+', label: 'Happy Customers', icon: '😊' },
  { end: 500, suffix: '+', label: 'Styles Available', icon: '👟' },
  { end: 4.8, decimals: 1, label: 'Average Rating', icon: '⭐' },
  { isText: true, main: 'Free Shipping', sub: 'Above ₹999', icon: '🚚' },
];

function StatsStrip() {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: '-60px' });

  return (
    <div ref={ref} className="border-y border-border py-10">
      <div className="max-w-7xl mx-auto px-5">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8 md:gap-0 md:divide-x divide-border">
          {STATS.map((stat, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 24 }}
              animate={isInView ? { opacity: 1, y: 0 } : {}}
              transition={{ delay: i * 0.1, duration: 0.5, ease: 'easeOut' }}
              className="flex flex-col items-center text-center px-4"
            >
              <span className="text-2xl mb-3">{stat.icon}</span>
              {stat.isText ? (
                <>
                  <p className="font-display text-2xl md:text-3xl font-bold text-textPrimary">{stat.main}</p>
                  <p className="font-body text-sm text-textSecondary mt-1.5">{stat.sub}</p>
                </>
              ) : (
                <>
                  <p className="font-mono text-2xl md:text-3xl font-bold text-accent">
                    {isInView ? (
                      <CountUp
                        end={stat.end}
                        decimals={stat.decimals || 0}
                        suffix={stat.suffix || ''}
                        duration={2.2}
                        useEasing
                      />
                    ) : '0'}
                  </p>
                  <p className="font-body text-sm text-textSecondary mt-1.5">{stat.label}</p>
                </>
              )}
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ── 6. NEW ARRIVALS ───────────────────────────────────────────────────────────

function NewArrivalsSection() {
  const dispatch = useDispatch();

  const { data, isLoading } = useQuery({
    queryKey: ['products', 'new-arrivals'],
    queryFn: async () => {
      const res = await api.get('/products?sort=newest&limit=8');
      return res.data.data;
    },
  });

  const products = data?.products || [];

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
    <section className="py-20">
      <div className="max-w-7xl mx-auto px-5">
        <InViewSection>
          <SectionLabel>Just Landed</SectionLabel>
          <SectionHeading>New Arrivals</SectionHeading>
        </InViewSection>
      </div>

      {isLoading ? (
        <div className="flex gap-4 overflow-hidden px-5 max-w-7xl mx-auto">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="shrink-0 w-52">
              <Skeleton height={220} width={208} rounded="rounded-2xl" />
              <div className="mt-3 space-y-2">
                <Skeleton height={13} width={140} />
                <Skeleton height={11} width={80} />
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="overflow-x-auto md:overflow-visible -mx-5 px-5 md:mx-0 md:px-0">
          <motion.div
            variants={gridContainerVariants}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: '-60px' }}
            className="flex md:grid md:grid-cols-4 gap-4 md:px-5 lg:px-0 lg:max-w-7xl lg:mx-auto w-max md:w-full pb-3 md:pb-0 snap-x snap-mandatory md:snap-none"
          >
            {products.map((p) => (
              <div key={p._id} className="relative snap-start shrink-0 w-52 md:w-auto">
                {/* New In badge overlay */}
                <div className="absolute top-3 left-3 z-30 pointer-events-none">
                  <Badge variant="purple">New In</Badge>
                </div>
                <motion.div variants={gridItemVariants}>
                  <ProductCard product={p} view="grid" onAddToCart={handleAdd} />
                </motion.div>
              </div>
            ))}
          </motion.div>
        </div>
      )}

      <div className="flex justify-center mt-10 px-5">
        <Link to="/shop?sort=newest">
          <motion.div
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.97 }}
            className="inline-flex items-center gap-2.5 px-9 py-3.5 rounded-full border-2 border-textPrimary/25 text-textPrimary font-body font-semibold tracking-wide hover:border-textPrimary hover:bg-textPrimary hover:text-background transition-all duration-200 cursor-pointer"
          >
            View All New Arrivals <ArrowRight size={16} strokeWidth={2} />
          </motion.div>
        </Link>
      </div>
    </section>
  );
}

// ── 7. TESTIMONIALS ───────────────────────────────────────────────────────────

const TESTIMONIALS = [
  {
    text: "Finally found shoes that look premium AND feel comfortable all day. Got the Heritage Classic in brown — received so many compliments at work. Will definitely order again!",
    name: 'Rahul Sharma',
    city: 'Delhi',
    rating: 5,
  },
  {
    text: "The packaging was gorgeous and delivery was super quick. My Air Phantom Ultras fit perfectly — I sized up as advised. Love the brand, love the quality!",
    name: 'Priya Nair',
    city: 'Mumbai',
    rating: 5,
  },
  {
    text: "Best shoe shopping experience online. Returns process was smooth when I needed a different size. Quality is genuinely premium for the price. Highly recommend.",
    name: 'Arjun Mehta',
    city: 'Bangalore',
    rating: 5,
  },
];

function TestimonialsSection() {
  return (
    <section className="max-w-7xl mx-auto px-5 py-20">
      <InViewSection>
        <SectionLabel>What They Say</SectionLabel>
        <SectionHeading>Customer Love</SectionHeading>

        <motion.div variants={staggerContainer} className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {TESTIMONIALS.map((t, i) => (
            <motion.div
              key={i}
              variants={{
                hidden: { opacity: 0, y: 36 },
                visible: {
                  opacity: 1, y: 0,
                  transition: { duration: 0.55, delay: i * 0.13, ease: 'easeOut' },
                },
              }}
              className="relative flex flex-col gap-4 bg-surface rounded-2xl border border-border p-6 overflow-hidden"
            >
              {/* Decorative quote mark */}
              <span className="absolute -top-3 -left-1 font-display text-9xl text-accent/8 leading-none select-none pointer-events-none">
                "
              </span>

              {/* Stars */}
              <div className="flex items-center gap-0.5 relative">
                {Array.from({ length: t.rating }).map((_, j) => (
                  <Star
                    key={j}
                    size={14}
                    className="text-gold"
                    strokeWidth={1}
                    style={{ fill: 'currentColor' }}
                  />
                ))}
              </div>

              {/* Review */}
              <p className="font-body text-sm text-textSecondary italic leading-relaxed flex-1 relative">
                "{t.text}"
              </p>

              {/* Reviewer info */}
              <div className="flex items-center gap-3 pt-3.5 border-t border-border">
                <div className="w-9 h-9 rounded-full bg-accent/12 border border-accent/20 flex items-center justify-center shrink-0">
                  <span className="font-display text-sm text-accent font-bold">{t.name.charAt(0)}</span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-display text-sm text-textPrimary leading-tight">{t.name}</p>
                  <p className="font-body text-[10px] text-textMuted">{t.city}</p>
                </div>
                <Badge variant="success">Verified Buyer</Badge>
              </div>
            </motion.div>
          ))}
        </motion.div>
      </InViewSection>
    </section>
  );
}

// ── 8. NEWSLETTER ─────────────────────────────────────────────────────────────

function NewsletterSection() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email.trim()) return;
    setLoading(true);
    await new Promise((r) => setTimeout(r, 900));
    setLoading(false);
    setSubmitted(true);
  };

  return (
    <section className="max-w-7xl mx-auto px-5 py-20">
      <InViewSection>
        <motion.div
          variants={fadeUp}
          className="bg-surface2 rounded-3xl py-16 px-8 md:px-16 text-center overflow-hidden relative"
        >
          {/* Background accent circles */}
          <div className="absolute -top-12 -right-12 w-48 h-48 rounded-full bg-accent/6 blur-2xl pointer-events-none" />
          <div className="absolute -bottom-12 -left-12 w-48 h-48 rounded-full bg-accent2/5 blur-2xl pointer-events-none" />

          <p className="relative font-body text-[11px] uppercase tracking-[0.2em] text-accent font-semibold mb-4">
            Stay In The Loop
          </p>
          <h2 className="relative font-display text-3xl md:text-4xl text-textPrimary mb-3">
            Get Early Access
          </h2>
          <p className="relative font-body text-textSecondary max-w-sm mx-auto mb-8 text-sm leading-relaxed">
            New drops, exclusive deals, style tips — straight to your inbox.
          </p>

          <AnimatePresence mode="wait">
            {submitted ? (
              <motion.div
                key="success"
                initial={{ opacity: 0, scale: 0.88 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.88 }}
                transition={{ type: 'spring', stiffness: 300, damping: 26 }}
                className="flex flex-col items-center gap-3 relative"
              >
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: 'spring', stiffness: 420, damping: 22, delay: 0.1 }}
                  className="w-14 h-14 rounded-full bg-accent3/15 border border-accent3/25 flex items-center justify-center"
                >
                  <Check size={22} className="text-accent3" strokeWidth={2.5} />
                </motion.div>
                <p className="font-display text-xl text-textPrimary">You're in!</p>
                <p className="font-body text-sm text-textSecondary">We'll be in touch with the good stuff.</p>
              </motion.div>
            ) : (
              <motion.form
                key="form"
                initial={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onSubmit={handleSubmit}
                className="flex flex-col sm:flex-row gap-2 max-w-md mx-auto relative"
              >
                <div className="relative flex-1">
                  <Mail size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-textMuted" strokeWidth={1.8} />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="your@email.com"
                    required
                    className="w-full pl-10 pr-4 py-3.5 rounded-xl bg-background border border-border font-body text-sm text-textPrimary placeholder:text-textMuted outline-none focus:border-accent transition-colors duration-200"
                  />
                </div>
                <motion.button
                  type="submit"
                  disabled={loading}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.97 }}
                  className="px-6 py-3.5 rounded-xl bg-accent text-white font-body font-semibold text-sm hover:bg-orange-600 transition-colors duration-200 disabled:opacity-55 whitespace-nowrap"
                >
                  {loading ? 'Subscribing…' : 'Subscribe'}
                </motion.button>
              </motion.form>
            )}
          </AnimatePresence>

          {!submitted && (
            <p className="relative font-body text-xs text-textMuted mt-4">
              No spam. Unsubscribe anytime.
            </p>
          )}
        </motion.div>
      </InViewSection>
    </section>
  );
}

// ── MAIN ──────────────────────────────────────────────────────────────────────

export default function HomePage() {
  return (
    <div className="bg-background">
      <HeroSection />
      <MarqueeStrip />
      <CategoriesSection />
      <FeaturedSection />
      <StatsStrip />
      <NewArrivalsSection />
      <TestimonialsSection />
      <NewsletterSection />
    </div>
  );
}
