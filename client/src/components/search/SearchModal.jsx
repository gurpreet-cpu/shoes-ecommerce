import { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, X, Clock, TrendingUp, ArrowRight } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import api from '../../lib/axios';
import { Skeleton } from '../ui';
import { formatPrice } from '../../lib/utils';

const STORAGE_KEY = 'sole_recent_searches';
const MAX_RECENT = 6;

const getRecent = () => {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY)) || []; }
  catch { return []; }
};

const saveRecent = (q) => {
  const next = [q, ...getRecent().filter((r) => r !== q)].slice(0, MAX_RECENT);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
};

const removeRecent = (q) => {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(getRecent().filter((r) => r !== q)));
};

const POPULAR_TAGS = ['Running Shoes', 'Sneakers', 'Formal', 'Sports', 'Casual', 'Boots', 'Sandals'];

export default function SearchModal({ open, onClose }) {
  const [query, setQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [recent, setRecent] = useState(getRecent);
  const inputRef = useRef(null);
  const navigate = useNavigate();

  useEffect(() => {
    const t = setTimeout(() => setDebouncedQuery(query.trim()), 300);
    return () => clearTimeout(t);
  }, [query]);

  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 80);
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
      setQuery('');
      setDebouncedQuery('');
    }
    return () => { document.body.style.overflow = ''; };
  }, [open]);

  useEffect(() => {
    const handler = (e) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [onClose]);

  const { data, isLoading } = useQuery({
    queryKey: ['search', debouncedQuery],
    queryFn: async () => {
      const res = await api.get(`/products?search=${encodeURIComponent(debouncedQuery)}&limit=8`);
      return res.data.data;
    },
    enabled: debouncedQuery.length >= 2,
    staleTime: 30_000,
  });

  const products = data?.products || [];

  const commit = useCallback((q) => {
    saveRecent(q);
    setRecent(getRecent());
    onClose();
  }, [onClose]);

  const handleEnter = (e) => {
    if (e.key === 'Enter' && query.trim()) {
      commit(query.trim());
      navigate(`/shop?search=${encodeURIComponent(query.trim())}`);
    }
  };

  const handleRemoveRecent = (q, e) => {
    e.preventDefault();
    e.stopPropagation();
    removeRecent(q);
    setRecent(getRecent());
  };

  const showEmpty = !query;
  const showLoading = debouncedQuery.length >= 2 && isLoading;
  const showNoResults = debouncedQuery.length >= 2 && !isLoading && products.length === 0;
  const showResults = products.length > 0;

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.18 }}
          className="fixed inset-0 z-[150] flex flex-col"
        >
          {/* Backdrop — click to close */}
          <div
            className="absolute inset-0 bg-background/96 backdrop-blur-lg"
            onClick={onClose}
          />

          <motion.div
            initial={{ opacity: 0, y: -16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            transition={{ duration: 0.22, ease: 'easeOut' }}
            className="relative flex flex-col h-full"
          >
            {/* Search bar */}
            <div className="border-b border-border bg-background/80">
              <div className="max-w-2xl mx-auto px-5 py-4 flex items-center gap-3">
                <Search size={20} className="text-textSecondary shrink-0" strokeWidth={1.8} />
                <input
                  ref={inputRef}
                  type="text"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  onKeyDown={handleEnter}
                  placeholder="Search for shoes, brands, styles…"
                  className="flex-1 bg-transparent font-body text-lg text-textPrimary placeholder:text-textMuted outline-none"
                />
                <AnimatePresence>
                  {query && (
                    <motion.button
                      initial={{ scale: 0, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      exit={{ scale: 0, opacity: 0 }}
                      transition={{ duration: 0.15 }}
                      onClick={() => setQuery('')}
                      className="p-1.5 rounded-lg text-textSecondary hover:text-textPrimary hover:bg-surface transition-all duration-200"
                    >
                      <X size={15} strokeWidth={2} />
                    </motion.button>
                  )}
                </AnimatePresence>
                <button
                  onClick={onClose}
                  className="hidden sm:flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-border font-mono text-xs text-textMuted hover:text-textSecondary hover:border-borderDark transition-all duration-200"
                >
                  ESC
                </button>
              </div>
            </div>

            {/* Results area */}
            <div className="flex-1 overflow-y-auto">
              <div className="max-w-2xl mx-auto px-5 py-6">

                {/* Empty input state */}
                {showEmpty && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.1 }}
                  >
                    {recent.length > 0 && (
                      <section className="mb-8">
                        <SectionLabel icon={Clock} label="Recent Searches" />
                        <ul className="space-y-0.5 mt-3">
                          {recent.map((q) => (
                            <li key={q}>
                              <Link
                                to={`/shop?search=${encodeURIComponent(q)}`}
                                onClick={() => commit(q)}
                                className="flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-surface transition-all duration-150 group"
                              >
                                <Clock size={13} className="text-textMuted shrink-0" strokeWidth={1.8} />
                                <span className="flex-1 font-body text-sm text-textSecondary group-hover:text-textPrimary transition-colors">
                                  {q}
                                </span>
                                <button
                                  onClick={(e) => handleRemoveRecent(q, e)}
                                  className="opacity-0 group-hover:opacity-100 p-1 rounded-md hover:bg-surface2 transition-all duration-150"
                                >
                                  <X size={11} strokeWidth={2.5} className="text-textMuted" />
                                </button>
                              </Link>
                            </li>
                          ))}
                        </ul>
                      </section>
                    )}

                    <section>
                      <SectionLabel icon={TrendingUp} label="Popular" />
                      <div className="flex flex-wrap gap-2 mt-3">
                        {POPULAR_TAGS.map((tag) => (
                          <Link
                            key={tag}
                            to={`/shop?search=${encodeURIComponent(tag)}`}
                            onClick={() => commit(tag)}
                            className="px-4 py-2 rounded-xl border border-border font-body text-sm text-textSecondary hover:border-accent hover:text-accent hover:bg-accent/5 transition-all duration-200"
                          >
                            {tag}
                          </Link>
                        ))}
                      </div>
                    </section>
                  </motion.div>
                )}

                {/* Loading skeletons */}
                {showLoading && (
                  <div className="space-y-3">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <div key={i} className="flex gap-4 p-3">
                        <Skeleton width={64} height={64} rounded="rounded-xl" />
                        <div className="flex-1 space-y-2.5 py-1">
                          <Skeleton width="55%" height={14} />
                          <Skeleton width="35%" height={11} />
                          <Skeleton width="25%" height={14} />
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* No results */}
                {showNoResults && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="text-center py-16"
                  >
                    <p className="font-mono text-xs text-textMuted uppercase tracking-widest mb-3">
                      No results for
                    </p>
                    <p className="font-display text-4xl text-textPrimary">"{debouncedQuery}"</p>
                    <p className="font-body text-sm text-textSecondary mt-3">
                      Try different keywords or browse our collection
                    </p>
                    <Link
                      to="/shop"
                      onClick={onClose}
                      className="inline-flex items-center gap-2 mt-6 px-5 py-2.5 rounded-xl border border-border font-body text-sm text-textSecondary hover:border-accent hover:text-accent transition-all duration-200"
                    >
                      Browse all shoes <ArrowRight size={14} strokeWidth={2} />
                    </Link>
                  </motion.div>
                )}

                {/* Results */}
                {showResults && (
                  <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                    <p className="font-body text-xs text-textMuted uppercase tracking-widest mb-3">
                      {data?.total || products.length} result{(data?.total || products.length) !== 1 ? 's' : ''}
                    </p>
                    <div className="space-y-0.5">
                      {products.map((product) => (
                        <SearchResult
                          key={product._id}
                          product={product}
                          onSelect={() => commit(query.trim())}
                          onClose={onClose}
                        />
                      ))}
                    </div>
                    {data?.total > 8 && (
                      <Link
                        to={`/shop?search=${encodeURIComponent(debouncedQuery)}`}
                        onClick={() => commit(debouncedQuery)}
                        className="flex items-center justify-center gap-2 mt-4 py-4 font-body text-sm text-accent hover:text-orange-600 transition-colors duration-200"
                      >
                        View all {data.total} results
                        <ArrowRight size={13} strokeWidth={2} />
                      </Link>
                    )}
                  </motion.div>
                )}
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function SectionLabel({ icon: Icon, label }) {
  return (
    <div className="flex items-center gap-2">
      <Icon size={12} className="text-textMuted" strokeWidth={1.8} />
      <span className="font-body text-[10px] uppercase tracking-[0.14em] text-textMuted">{label}</span>
    </div>
  );
}

function SearchResult({ product, onSelect, onClose }) {
  const hasDiscount = product.discountPrice && product.discountPrice < product.price;

  return (
    <Link
      to={`/shop/${product.slug}`}
      onClick={() => { onSelect(); onClose(); }}
      className="flex items-center gap-4 p-3 rounded-xl hover:bg-surface transition-all duration-150 group"
    >
      <div className="w-[60px] h-[60px] rounded-xl bg-surface2 overflow-hidden shrink-0 border border-border">
        {product.images?.[0]?.url ? (
          <img
            src={product.images[0].url}
            alt={product.name}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <Search size={18} className="text-textMuted" strokeWidth={1.5} />
          </div>
        )}
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-body text-[10px] text-textMuted uppercase tracking-wider">{product.brand}</p>
        <p className="font-display text-sm text-textPrimary group-hover:text-accent transition-colors duration-200 truncate mt-0.5">
          {product.name}
        </p>
        <div className="flex items-center gap-2 mt-1">
          <span className="font-mono text-sm text-accent font-medium">
            {formatPrice(product.discountPrice || product.price)}
          </span>
          {hasDiscount && (
            <span className="font-mono text-xs text-textMuted line-through">
              {formatPrice(product.price)}
            </span>
          )}
        </div>
      </div>
      <ArrowRight
        size={15}
        className="text-textMuted group-hover:text-accent group-hover:translate-x-0.5 transition-all duration-200 shrink-0"
        strokeWidth={1.8}
      />
    </Link>
  );
}
