import { useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import * as Tabs from '@radix-ui/react-tabs';
import * as Select from '@radix-ui/react-select';
import { ChevronDown, LayoutGrid, List, Home, ChevronRight, SlidersHorizontal, Check } from 'lucide-react';
import { useDispatch } from 'react-redux';
import { ProductCard, Skeleton, EmptyState, Pagination } from '../components/ui';
import { gridContainerVariants, gridItemVariants } from '../components/ui';
import api from '../lib/axios';
import { toast } from '../lib/toast';
import { setCart } from '../store/cartSlice';
import { cn } from '../lib/utils';

// ── Constants ──────────────────────────────────────────────────────────────────

const CAT_TABS = [
  { value: 'all', label: 'All' },
  { value: 'mens', label: 'Men' },
  { value: 'womens', label: 'Women' },
];

const SUBCATS = [
  { value: 'all', label: 'All' },
  { value: 'casual', label: 'Casual' },
  { value: 'sports', label: 'Sports' },
  { value: 'formal', label: 'Formal' },
  { value: 'sandals', label: 'Sandals' },
  { value: 'boots', label: 'Boots' },
];

const PRICE_RANGES = [
  { value: 'all', label: 'All Prices' },
  { value: 'under1000', label: 'Under ₹1,000' },
  { value: '1000to3000', label: '₹1,000–₹3,000' },
  { value: 'above3000', label: 'Above ₹3,000' },
];

const PRICE_PARAMS = {
  all: {},
  under1000: { maxPrice: 1000 },
  '1000to3000': { minPrice: 1000, maxPrice: 3000 },
  above3000: { minPrice: 3000 },
};

const SORT_OPTIONS = [
  { value: 'newest', label: 'Newest First' },
  { value: 'price_asc', label: 'Price: Low to High' },
  { value: 'price_desc', label: 'Price: High to Low' },
  { value: 'rating', label: 'Top Rated' },
];

const HEADING_MAP = {
  mens: "MEN'S COLLECTION",
  womens: "WOMEN'S COLLECTION",
};

// ── URL param helpers ──────────────────────────────────────────────────────────

function useShopFilters() {
  const [searchParams, setSearchParams] = useSearchParams();

  const category = searchParams.get('category') || 'all';
  const subCategory = searchParams.get('subCategory') || 'all';
  const priceRange = searchParams.get('priceRange') || 'all';
  const sortBy = searchParams.get('sortBy') || 'newest';
  const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10));

  const setFilter = (key, value) => {
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      if (!value || value === 'all') {
        next.delete(key);
      } else {
        next.set(key, String(value));
      }
      // Any filter change resets to page 1
      if (key !== 'page') next.delete('page');
      return next;
    });
  };

  const apiParams = {
    ...(category !== 'all' && { category }),
    ...(subCategory !== 'all' && { subCategory }),
    ...PRICE_PARAMS[priceRange],
    sortBy,
    page,
    limit: 12,
  };

  return { category, subCategory, priceRange, sortBy, page, setFilter, apiParams };
}

// ── Filter Bar ─────────────────────────────────────────────────────────────────

function Chip({ active, onClick, children }) {
  return (
    <motion.button
      whileHover={{ scale: 1.03 }}
      whileTap={{ scale: 0.97 }}
      onClick={onClick}
      className={cn(
        'shrink-0 px-3.5 py-1.5 rounded-full font-body text-xs font-medium transition-all duration-200 border',
        active
          ? 'bg-accent border-accent text-white'
          : 'bg-background border-border text-textSecondary hover:border-accent/50 hover:text-textPrimary'
      )}
    >
      {children}
    </motion.button>
  );
}

function SortSelect({ value, onChange }) {
  const current = SORT_OPTIONS.find((o) => o.value === value);
  return (
    <Select.Root value={value} onValueChange={onChange}>
      <Select.Trigger className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-full border border-border bg-background font-body text-xs font-medium text-textSecondary hover:border-accent/50 hover:text-textPrimary transition-all duration-200 outline-none shrink-0">
        <SlidersHorizontal size={12} strokeWidth={2} />
        <Select.Value>{current?.label || 'Sort'}</Select.Value>
        <Select.Icon>
          <ChevronDown size={12} strokeWidth={2} />
        </Select.Icon>
      </Select.Trigger>
      <Select.Portal>
        <Select.Content
          position="popper"
          sideOffset={8}
          className="z-[200] bg-background border border-border rounded-2xl shadow-xl overflow-hidden min-w-[180px]"
        >
          <Select.Viewport className="p-1.5">
            {SORT_OPTIONS.map((opt) => (
              <Select.Item
                key={opt.value}
                value={opt.value}
                className="flex items-center justify-between px-3 py-2.5 rounded-xl font-body text-sm text-textPrimary cursor-pointer outline-none data-[highlighted]:bg-surface transition-colors duration-150"
              >
                <Select.ItemText>{opt.label}</Select.ItemText>
                {value === opt.value && <Check size={13} className="text-accent" strokeWidth={2.5} />}
              </Select.Item>
            ))}
          </Select.Viewport>
        </Select.Content>
      </Select.Portal>
    </Select.Root>
  );
}

function FilterBar({ category, subCategory, priceRange, sortBy, setFilter }) {
  return (
    <div className="sticky top-16 z-40 bg-background/90 backdrop-blur-md border-b border-border">
      {/* Desktop layout */}
      <div className="hidden md:flex items-center justify-between px-5 py-2.5 max-w-7xl mx-auto gap-4">
        {/* Left: category tabs + subcategory + price */}
        <div className="flex items-center gap-3 flex-wrap">
          {/* Category tabs */}
          <Tabs.Root
            value={category}
            onValueChange={(v) => setFilter('category', v)}
          >
            <Tabs.List className="flex items-center gap-0.5">
              {CAT_TABS.map((tab) => (
                <Tabs.Trigger
                  key={tab.value}
                  value={tab.value}
                  className="relative px-3.5 py-1.5 font-body text-xs font-semibold rounded-lg outline-none transition-colors duration-200 data-[state=active]:text-accent data-[state=inactive]:text-textSecondary hover:text-textPrimary"
                >
                  {tab.label}
                  {category === tab.value && (
                    <motion.span
                      layoutId="shop-cat-underline"
                      className="absolute bottom-0 left-2 right-2 h-0.5 bg-accent rounded-full"
                      transition={{ type: 'spring', stiffness: 500, damping: 40 }}
                    />
                  )}
                </Tabs.Trigger>
              ))}
            </Tabs.List>
          </Tabs.Root>

          <div className="w-px h-5 bg-border" />

          {/* SubCategory chips */}
          <div className="flex items-center gap-1.5">
            {SUBCATS.map((s) => (
              <Chip
                key={s.value}
                active={subCategory === s.value}
                onClick={() => setFilter('subCategory', s.value)}
              >
                {s.label}
              </Chip>
            ))}
          </div>

          <div className="w-px h-5 bg-border" />

          {/* Price range chips */}
          <div className="flex items-center gap-1.5">
            {PRICE_RANGES.map((p) => (
              <Chip
                key={p.value}
                active={priceRange === p.value}
                onClick={() => setFilter('priceRange', p.value)}
              >
                {p.label}
              </Chip>
            ))}
          </div>
        </div>

        {/* Right: sort */}
        <SortSelect value={sortBy} onChange={(v) => setFilter('sortBy', v)} />
      </div>

      {/* Mobile layout: single horizontal scroll */}
      <div className="md:hidden overflow-x-auto px-5 py-2.5">
        <div className="flex items-center gap-2 min-w-max">
          {CAT_TABS.map((tab) => (
            <Chip
              key={tab.value}
              active={category === tab.value}
              onClick={() => setFilter('category', tab.value)}
            >
              {tab.label}
            </Chip>
          ))}

          <div className="w-px h-4 bg-border mx-1" />

          {SUBCATS.slice(1).map((s) => (
            <Chip
              key={s.value}
              active={subCategory === s.value}
              onClick={() => setFilter('subCategory', s.value)}
            >
              {s.label}
            </Chip>
          ))}

          <div className="w-px h-4 bg-border mx-1" />

          {PRICE_RANGES.slice(1).map((p) => (
            <Chip
              key={p.value}
              active={priceRange === p.value}
              onClick={() => setFilter('priceRange', p.value)}
            >
              {p.label}
            </Chip>
          ))}

          <div className="w-px h-4 bg-border mx-1" />

          <SortSelect value={sortBy} onChange={(v) => setFilter('sortBy', v)} />
        </div>
      </div>
    </div>
  );
}

// ── Product Grid ───────────────────────────────────────────────────────────────

function ProductGridSkeleton({ count = 6 }) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="flex flex-col gap-3">
          <Skeleton height={240} width="100%" rounded="rounded-2xl" />
          <Skeleton height={13} width="65%" />
          <Skeleton height={11} width="40%" />
          <Skeleton height={13} width="30%" />
        </div>
      ))}
    </div>
  );
}

// ── Main Page ──────────────────────────────────────────────────────────────────

export default function ShopPage() {
  const dispatch = useDispatch();
  const [viewMode, setViewMode] = useState('grid');
  const { category, subCategory, priceRange, sortBy, page, setFilter, apiParams } = useShopFilters();

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['products', apiParams],
    queryFn: () => api.get('/products', { params: apiParams }).then((r) => r.data.data),
    keepPreviousData: true,
  });

  const products = data?.products || [];
  const totalCount = data?.totalCount || 0;
  const totalPages = data?.totalPages || 1;
  const heading = HEADING_MAP[category] || 'ALL SHOES';

  const handleAddToCart = async (product) => {
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
    <div className="min-h-screen bg-background">
      {/* Page header */}
      <div className="max-w-7xl mx-auto px-5 pt-8 pb-4">
        {/* Breadcrumb */}
        <div className="flex items-center gap-1.5 mb-5">
          <Link to="/" className="flex items-center gap-1 font-body text-xs text-textMuted hover:text-accent transition-colors duration-200">
            <Home size={12} strokeWidth={1.8} />
            Home
          </Link>
          <ChevronRight size={11} className="text-textMuted" strokeWidth={1.5} />
          <span className="font-body text-xs text-textSecondary">Shop</span>
          {category !== 'all' && (
            <>
              <ChevronRight size={11} className="text-textMuted" strokeWidth={1.5} />
              <span className="font-body text-xs text-accent capitalize">
                {category === 'mens' ? "Men's" : "Women's"}
              </span>
            </>
          )}
        </div>

        <motion.h1
          key={heading}
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, ease: 'easeOut' }}
          className="font-display text-3xl md:text-4xl text-textPrimary"
        >
          {heading}
        </motion.h1>
      </div>

      {/* Sticky filter bar */}
      <FilterBar
        category={category}
        subCategory={subCategory}
        priceRange={priceRange}
        sortBy={sortBy}
        setFilter={setFilter}
      />

      {/* Main content */}
      <div className="max-w-7xl mx-auto px-5 py-6">
        {/* Results header */}
        {!isLoading && !isError && (
          <div className="flex items-center justify-between mb-5">
            <p className="font-body text-sm text-textMuted">
              {totalCount > 0
                ? `Showing ${Math.min(products.length, apiParams.limit)} of ${totalCount} shoes`
                : 'No results found'}
            </p>
            <div className="flex items-center gap-1">
              <motion.button
                whileHover={{ scale: 1.08 }}
                whileTap={{ scale: 0.92 }}
                onClick={() => setViewMode('grid')}
                className={cn(
                  'p-2 rounded-lg transition-colors duration-200',
                  viewMode === 'grid' ? 'bg-accent/10 text-accent' : 'text-textMuted hover:text-textPrimary'
                )}
              >
                <LayoutGrid size={16} strokeWidth={1.8} />
              </motion.button>
              <motion.button
                whileHover={{ scale: 1.08 }}
                whileTap={{ scale: 0.92 }}
                onClick={() => setViewMode('list')}
                className={cn(
                  'p-2 rounded-lg transition-colors duration-200',
                  viewMode === 'list' ? 'bg-accent/10 text-accent' : 'text-textMuted hover:text-textPrimary'
                )}
              >
                <List size={16} strokeWidth={1.8} />
              </motion.button>
            </div>
          </div>
        )}

        {/* Loading */}
        {isLoading && <ProductGridSkeleton count={6} />}

        {/* Error */}
        {isError && (
          <div className="flex flex-col items-center py-20 gap-4">
            <p className="font-body text-textSecondary">Couldn't load products. Please try again.</p>
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => refetch()}
              className="px-5 py-2.5 rounded-xl border border-border font-body text-sm text-textSecondary hover:border-accent hover:text-accent transition-all duration-200"
            >
              Retry
            </motion.button>
          </div>
        )}

        {/* Empty */}
        {!isLoading && !isError && products.length === 0 && (
          <EmptyState
            icon={LayoutGrid}
            title="No shoes found"
            description="Try adjusting your filters or browse all collections."
            action={{ label: 'Clear Filters', onClick: () => setFilter('all', null) }}
          />
        )}

        {/* Grid / List results */}
        {!isLoading && !isError && products.length > 0 && (
          <AnimatePresence mode="wait">
            <motion.div
              key={`${viewMode}-${JSON.stringify(apiParams)}`}
              variants={gridContainerVariants}
              initial="hidden"
              animate="visible"
              exit={{ opacity: 0 }}
              className={cn(
                viewMode === 'grid'
                  ? 'grid grid-cols-2 md:grid-cols-3 gap-4'
                  : 'flex flex-col gap-3'
              )}
            >
              {products.map((p) => (
                <motion.div key={p._id} variants={gridItemVariants}>
                  <ProductCard
                    product={p}
                    view={viewMode}
                    onAddToCart={handleAddToCart}
                  />
                </motion.div>
              ))}
            </motion.div>
          </AnimatePresence>
        )}

        {/* Pagination */}
        {!isLoading && totalPages > 1 && (
          <div className="flex justify-center mt-10">
            <Pagination
              currentPage={page}
              totalPages={totalPages}
              onPageChange={(p) => setFilter('page', p === 1 ? null : String(p))}
            />
          </div>
        )}
      </div>
    </div>
  );
}
