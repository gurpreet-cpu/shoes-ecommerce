import { useState } from 'react';
import { ShoppingBag, Mail, Search, Package } from 'lucide-react';
import { motion } from 'framer-motion';
import {
  Button, Input, Card, Badge, Skeleton,
  Modal, Drawer, LoadingSpinner, EmptyState,
  Pagination, StarRating, ProductCard,
  gridContainerVariants,
} from './components/ui/index';
import { toast } from './lib/toast';

const MOCK_PRODUCT = {
  _id: '1',
  name: 'Air Phantom Ultra Boost Running Shoe',
  slug: 'air-phantom-ultra-boost',
  brand: 'StepStyle',
  price: 3999,
  discountPrice: 2699,
  images: [{ url: 'https://placehold.co/400x400/f5f4f0/c8c4be?text=Shoe', publicId: '1' }],
  ratings: { average: 4.5, count: 128 },
  sizes: [
    { size: '7', stock: 3 },
    { size: '8', stock: 0 },
    { size: '9', stock: 5 },
    { size: '10', stock: 2 },
    { size: '11', stock: 0 },
  ],
};

const MOCK_PRODUCTS = Array.from({ length: 4 }, (_, i) => ({
  ...MOCK_PRODUCT,
  _id: String(i + 1),
  slug: `product-${i + 1}`,
  name: ['Air Phantom Ultra', 'Cloud Step Pro', 'Urban Runner X', 'Heritage Classic'][i],
  price: [3999, 5499, 2999, 4299][i],
  discountPrice: [2699, null, 1999, 3499][i],
}));

function Section({ title, children }) {
  return (
    <div className="mb-12">
      <h2 className="font-display text-lg text-textSecondary uppercase tracking-widest mb-5 pb-2 border-b border-border">
        {title}
      </h2>
      {children}
    </div>
  );
}

export default function App() {
  const [modalOpen, setModalOpen] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [page, setPage] = useState(1);
  const [rating, setRating] = useState(0);

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-5xl mx-auto px-6 py-12">
        {/* Header */}
        <div className="mb-14 text-center">
          <p className="font-mono text-xs text-accent tracking-widest uppercase mb-3">StepStyle UI Kit</p>
          <h1 className="font-display text-5xl text-textPrimary mb-3">Component Library</h1>
          <p className="font-body text-textSecondary">Warm white Gen Z aesthetic · Framer Motion · Tailwind</p>
        </div>

        {/* Buttons */}
        <Section title="Buttons">
          <div className="flex flex-wrap gap-3 mb-4">
            <Button variant="primary" icon={<ShoppingBag size={15} />}>Add to Cart</Button>
            <Button variant="secondary">Explore</Button>
            <Button variant="outline">Save</Button>
            <Button variant="ghost">Cancel</Button>
            <Button variant="danger">Delete</Button>
          </div>
          <div className="flex flex-wrap gap-3 mb-4">
            <Button size="sm">Small</Button>
            <Button size="md">Medium</Button>
            <Button size="lg">Large</Button>
          </div>
          <div className="flex flex-wrap gap-3">
            <Button loading>Processing…</Button>
            <Button disabled>Disabled</Button>
          </div>
        </Section>

        {/* Inputs */}
        <Section title="Inputs">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 max-w-xl">
            <Input label="Email address" type="email" icon={Mail} placeholder="you@example.com" />
            <Input label="Search products" icon={Search} placeholder="Nike, Adidas…" />
            <Input label="With error" error="This field is required" />
            <Input label="Normal input" placeholder="Type something…" />
          </div>
        </Section>

        {/* Badges */}
        <Section title="Badges">
          <div className="flex flex-wrap gap-2">
            <Badge>Default</Badge>
            <Badge variant="success">In Stock</Badge>
            <Badge variant="warning">Low Stock</Badge>
            <Badge variant="error">Out of Stock</Badge>
            <Badge variant="accent">33% OFF</Badge>
            <Badge variant="purple">New Arrival</Badge>
          </div>
        </Section>

        {/* Skeletons + Spinners */}
        <Section title="Skeletons & Spinners">
          <div className="flex flex-wrap items-center gap-4 mb-4">
            <Skeleton width={200} height={120} />
            <Skeleton width={120} height={120} rounded="rounded-full" />
            <Skeleton width={160} height={20} />
          </div>
          <div className="flex flex-wrap items-center gap-8">
            <LoadingSpinner variant="spinner" size={28} />
            <LoadingSpinner variant="dots" size={10} />
            <LoadingSpinner variant="pulse" size={36} />
          </div>
        </Section>

        {/* Stars */}
        <Section title="Star Rating">
          <div className="flex flex-col gap-4">
            <StarRating rating={4.5} count={128} size={20} />
            <div className="flex items-center gap-3">
              <StarRating rating={rating} size={24} interactive onChange={setRating} />
              <span className="font-mono text-sm text-textSecondary">
                {rating > 0 ? `${rating} / 5` : 'Click to rate'}
              </span>
            </div>
          </div>
        </Section>

        {/* Modal + Drawer */}
        <Section title="Modal & Drawer">
          <div className="flex flex-wrap gap-3">
            <Button onClick={() => setModalOpen(true)}>Open Modal</Button>
            <Button variant="outline" onClick={() => setDrawerOpen(true)}>Open Cart Drawer</Button>
            <Button variant="ghost" onClick={() => toast.success('Order placed successfully!')}>
              Toast Success
            </Button>
            <Button variant="ghost" onClick={() => toast.error('Payment failed. Try again.')}>
              Toast Error
            </Button>
          </div>
        </Section>

        {/* Empty state */}
        <Section title="Empty State">
          <Card className="p-0 overflow-hidden">
            <EmptyState
              icon={Package}
              title="No orders yet"
              description="Once you place your first order, it will appear here."
              action={{ label: 'Start Shopping', onClick: () => {} }}
            />
          </Card>
        </Section>

        {/* Pagination */}
        <Section title="Pagination">
          <Pagination currentPage={page} totalPages={12} onPageChange={setPage} />
        </Section>

        {/* Product Cards */}
        <Section title="Product Cards — Grid View">
          <motion.div
            variants={gridContainerVariants}
            initial="hidden"
            animate="visible"
            className="grid grid-cols-2 md:grid-cols-4 gap-4"
          >
            {MOCK_PRODUCTS.map((p) => (
              <ProductCard
                key={p._id}
                product={p}
                view="grid"
                onAddToCart={() => toast.success(`${p.name} added to cart`)}
              />
            ))}
          </motion.div>
        </Section>

        <Section title="Product Card — List View">
          <motion.div
            variants={gridContainerVariants}
            initial="hidden"
            animate="visible"
            className="flex flex-col gap-3 max-w-xl"
          >
            {MOCK_PRODUCTS.slice(0, 2).map((p) => (
              <ProductCard
                key={p._id}
                product={p}
                view="list"
                onAddToCart={() => toast.success(`${p.name} added to cart`)}
              />
            ))}
          </motion.div>
        </Section>
      </div>

      {/* Modal */}
      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title="Size Guide" size="md">
        <p className="font-body text-textSecondary text-sm mb-4">
          Find your perfect fit using our international size chart.
        </p>
        <div className="grid grid-cols-3 gap-2 mb-5">
          {['UK 7', 'UK 8', 'UK 9', 'UK 10', 'UK 11', 'UK 12'].map((s) => (
            <button key={s} className="py-2.5 rounded-xl border border-border font-mono text-sm text-textPrimary hover:border-accent hover:text-accent transition-colors">
              {s}
            </button>
          ))}
        </div>
        <Button className="w-full" onClick={() => setModalOpen(false)}>
          Confirm Size
        </Button>
      </Modal>

      {/* Cart Drawer */}
      <Drawer open={drawerOpen} onClose={() => setDrawerOpen(false)} title="Your Cart" side="right">
        <div className="p-5 flex flex-col gap-4">
          {MOCK_PRODUCTS.slice(0, 2).map((p) => (
            <div key={p._id} className="flex gap-3 p-3 rounded-xl border border-border bg-surface">
              <div className="w-16 h-16 rounded-lg bg-surface2 shrink-0 overflow-hidden">
                <img src={p.images[0].url} alt={p.name} className="w-full h-full object-cover" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-display text-sm text-textPrimary line-clamp-1">{p.name}</p>
                <p className="font-body text-xs text-textSecondary mt-0.5">Size: UK 9 · Qty: 1</p>
                <p className="font-mono text-sm text-accent font-semibold mt-1">
                  {p.discountPrice
                    ? `₹${p.discountPrice.toLocaleString('en-IN')}`
                    : `₹${p.price.toLocaleString('en-IN')}`}
                </p>
              </div>
            </div>
          ))}

          <div className="mt-4 pt-4 border-t border-border">
            <div className="flex justify-between font-body text-sm mb-1">
              <span className="text-textSecondary">Subtotal</span>
              <span className="text-textPrimary font-medium">₹4,698</span>
            </div>
            <div className="flex justify-between font-body text-sm mb-4">
              <span className="text-textSecondary">Shipping</span>
              <span className="text-accent3 font-medium">Free</span>
            </div>
            <Button className="w-full" size="lg" onClick={() => toast.success('Proceeding to checkout')}>
              Checkout
            </Button>
          </div>
        </div>
      </Drawer>
    </div>
  );
}
