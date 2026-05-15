import { useState, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, X, Edit2, Power, PowerOff, Upload, Image } from 'lucide-react';
import api from '../../lib/axios';
import { toast } from '../../lib/toast';
import { formatPrice, cn } from '../../lib/utils';
import { Modal } from '../../components/ui';

// ── Constants ─────────────────────────────────────────────────────────────────

const SHOE_SIZES = ['6', '7', '8', '9', '10', '11', '12'];
const CATEGORIES = ['mens', 'womens'];
const SUBCATEGORIES = ['casual', 'sports', 'formal', 'sandals', 'boots'];

const productSchema = z.object({
  name: z.string().min(2, 'Name required'),
  description: z.string().min(10, 'At least 10 characters'),
  brand: z.string().min(1, 'Brand required'),
  category: z.enum(['mens', 'womens'], { required_error: 'Select category' }),
  subCategory: z.enum(['casual', 'sports', 'formal', 'sandals', 'boots'], { required_error: 'Select sub-category' }),
  price: z.number({ invalid_type_error: 'Enter a number' }).min(1, 'Price required'),
  discountPrice: z.union([z.number().min(0), z.literal('')]).optional(),
  color: z.string().optional(),
  material: z.string().optional(),
  tags: z.string().optional(),
  isFeatured: z.boolean().optional(),
});

// ── Form field components ──────────────────────────────────────────────────────

function FField({ label, error, children, required }) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="font-body text-xs font-semibold text-textSecondary">
        {label}{required && <span className="text-red-400 ml-0.5">*</span>}
      </label>
      {children}
      {error && <p className="font-body text-xs text-red-500">{error}</p>}
    </div>
  );
}

const inputCls = (err) => cn(
  'w-full px-3 py-2.5 rounded-xl border bg-surface font-body text-sm text-textPrimary placeholder:text-textMuted outline-none transition-colors duration-200',
  err ? 'border-red-400 focus:border-red-400' : 'border-border focus:border-accent'
);

const selectCls = 'w-full px-3 py-2.5 rounded-xl border border-border bg-surface font-body text-sm text-textPrimary outline-none focus:border-accent transition-colors duration-200';

// ── Image upload zone ──────────────────────────────────────────────────────────

function ImageZone({ existingImages, newFiles, onAddFiles, onRemoveExisting, onRemoveNew }) {
  const [dragging, setDragging] = useState(false);
  const inputRef = useRef(null);
  const total = existingImages.length + newFiles.length;

  const handleFiles = (files) => {
    const imgs = Array.from(files).filter((f) => f.type.startsWith('image/'));
    if (total + imgs.length > 5) { toast.error('Max 5 images'); return; }
    onAddFiles(imgs);
  };

  return (
    <div className="flex flex-col gap-3">
      {/* Previews */}
      {(existingImages.length > 0 || newFiles.length > 0) && (
        <div className="flex gap-2 flex-wrap">
          {existingImages.map((img) => (
            <div key={img.publicId} className="relative w-16 h-16">
              <img src={img.url} alt="" className="w-full h-full rounded-xl object-cover border border-border" />
              <button onClick={() => onRemoveExisting(img.publicId)} className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-red-500 text-white flex items-center justify-center">
                <X size={10} strokeWidth={2.5} />
              </button>
              <span className="absolute bottom-0.5 left-0.5 text-[8px] font-mono bg-black/50 text-white px-1 rounded">saved</span>
            </div>
          ))}
          {newFiles.map((file, i) => (
            <div key={i} className="relative w-16 h-16">
              <img src={URL.createObjectURL(file)} alt="" className="w-full h-full rounded-xl object-cover border border-border" />
              <button onClick={() => onRemoveNew(i)} className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-red-500 text-white flex items-center justify-center">
                <X size={10} strokeWidth={2.5} />
              </button>
              <span className="absolute bottom-0.5 left-0.5 text-[8px] font-mono bg-black/50 text-white px-1 rounded">new</span>
            </div>
          ))}
        </div>
      )}

      {/* Drop zone */}
      {total < 5 && (
        <div
          onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
          onDragLeave={() => setDragging(false)}
          onDrop={(e) => { e.preventDefault(); setDragging(false); handleFiles(e.dataTransfer.files); }}
          onClick={() => inputRef.current?.click()}
          className={cn(
            'flex flex-col items-center justify-center gap-2 p-6 rounded-xl border-2 border-dashed cursor-pointer transition-all duration-200',
            dragging ? 'border-accent bg-accent/5' : 'border-border hover:border-accent/50'
          )}
        >
          <Upload size={20} className="text-textMuted" strokeWidth={1.5} />
          <p className="font-body text-xs text-textSecondary text-center">Drop images or <span className="text-accent">browse</span><br /><span className="text-textMuted">Max 5 images · JPG/PNG/WEBP</span></p>
          <input ref={inputRef} type="file" multiple accept="image/*" className="hidden" onChange={(e) => handleFiles(e.target.files)} />
        </div>
      )}
    </div>
  );
}

// ── Size manager ──────────────────────────────────────────────────────────────

function SizeManager({ sizes, onChange }) {
  const addedSizes = new Set(sizes.map((s) => s.size));

  const toggle = (size) => {
    if (addedSizes.has(size)) {
      onChange(sizes.filter((s) => s.size !== size));
    } else {
      onChange([...sizes, { size, stock: 5 }]);
    }
  };

  const updateStock = (size, stock) => {
    onChange(sizes.map((s) => s.size === size ? { ...s, stock: Math.max(0, parseInt(stock) || 0) } : s));
  };

  return (
    <div className="flex flex-col gap-3">
      {/* Size grid */}
      <div className="flex gap-2 flex-wrap">
        {SHOE_SIZES.map((sz) => (
          <button
            key={sz}
            type="button"
            onClick={() => toggle(sz)}
            className={cn(
              'w-12 h-10 rounded-xl border font-mono text-sm font-medium transition-all duration-200',
              addedSizes.has(sz)
                ? 'bg-accent border-accent text-white'
                : 'border-border text-textSecondary hover:border-accent hover:text-accent'
            )}
          >
            {sz}
          </button>
        ))}
      </div>

      {/* Added sizes with stock */}
      {sizes.length > 0 && (
        <div className="flex gap-2 flex-wrap">
          {sizes.map(({ size, stock }) => (
            <div key={size} className="flex items-center gap-1.5 px-2 py-1 rounded-xl bg-surface2 border border-border">
              <span className="font-mono text-xs font-semibold text-accent">UK {size}</span>
              <input
                type="number"
                value={stock}
                min={0}
                onChange={(e) => updateStock(size, e.target.value)}
                className="w-12 px-1.5 py-0.5 rounded-lg border border-border bg-background font-mono text-xs text-textPrimary outline-none focus:border-accent text-center"
              />
              <span className="font-body text-[10px] text-textMuted">units</span>
              <button type="button" onClick={() => toggle(size)} className="text-textMuted hover:text-red-500 transition-colors">
                <X size={11} strokeWidth={2.5} />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Product form modal ─────────────────────────────────────────────────────────

function ProductModal({ product, onClose, onSuccess }) {
  const isEdit = !!product;
  const queryClient = useQueryClient();

  const [sizes, setSizes] = useState(product?.sizes || []);
  const [existingImages, setExistingImages] = useState(product?.images || []);
  const [newFiles, setNewFiles] = useState([]);
  const [removedIds, setRemovedIds] = useState([]);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: zodResolver(productSchema),
    defaultValues: {
      name: product?.name || '',
      description: product?.description || '',
      brand: product?.brand || '',
      category: product?.category || 'mens',
      subCategory: product?.subCategory || 'casual',
      price: product?.price || '',
      discountPrice: product?.discountPrice || '',
      color: product?.color || '',
      material: product?.material || '',
      tags: product?.tags?.join(', ') || '',
      isFeatured: product?.isFeatured || false,
    },
  });

  const onSubmit = async (data) => {
    if (!sizes.length) { toast.error('Add at least one size'); return; }
    if (!isEdit && !newFiles.length) { toast.error('Upload at least one image'); return; }

    const fd = new FormData();
    fd.append('name', data.name);
    fd.append('description', data.description);
    fd.append('brand', data.brand);
    fd.append('category', data.category);
    fd.append('subCategory', data.subCategory);
    fd.append('price', String(data.price));
    if (data.discountPrice) fd.append('discountPrice', String(data.discountPrice));
    if (data.color) fd.append('color', data.color);
    if (data.material) fd.append('material', data.material);
    fd.append('isFeatured', String(!!data.isFeatured));
    fd.append('sizes', JSON.stringify(sizes));
    if (data.tags) {
      fd.append('tags', JSON.stringify(data.tags.split(',').map((t) => t.trim()).filter(Boolean)));
    }
    newFiles.forEach((f) => fd.append('images', f));

    try {
      if (isEdit) {
        // Remove marked images first
        for (const pid of removedIds) {
          await api.delete(`/products/${product._id}/images/${pid}`).catch(() => {});
        }
        await api.put(`/products/${product._id}`, fd);
        toast.success('Product updated');
      } else {
        await api.post('/products', fd);
        toast.success('Product created');
      }
      queryClient.invalidateQueries({ queryKey: ['admin-products'] });
      onSuccess?.();
      onClose();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to save product');
    }
  };

  return (
    <Modal open onClose={onClose} title={isEdit ? 'Edit Product' : 'Add Product'} size="xl">
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-5 max-h-[70vh] overflow-y-auto pr-1">
        {/* Row 1: Name + Brand */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <FField label="Product Name" required error={errors.name?.message}>
            <input {...register('name')} placeholder="Air Phantom Ultra" className={inputCls(errors.name)} />
          </FField>
          <FField label="Brand" required error={errors.brand?.message}>
            <input {...register('brand')} placeholder="StepStyle" className={inputCls(errors.brand)} />
          </FField>
        </div>

        {/* Description */}
        <FField label="Description" required error={errors.description?.message}>
          <textarea {...register('description')} rows={3} placeholder="Describe the product…" className={cn(inputCls(errors.description), 'resize-none')} />
        </FField>

        {/* Row 2: Category + SubCategory */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <FField label="Category" required error={errors.category?.message}>
            <select {...register('category')} className={selectCls}>
              {CATEGORIES.map((c) => <option key={c} value={c}>{c === 'mens' ? "Men's" : "Women's"}</option>)}
            </select>
          </FField>
          <FField label="Sub-Category" required error={errors.subCategory?.message}>
            <select {...register('subCategory')} className={selectCls}>
              {SUBCATEGORIES.map((c) => <option key={c} value={c} className="capitalize">{c}</option>)}
            </select>
          </FField>
        </div>

        {/* Row 3: Price + Discount + Color + Material */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <FField label="Price (₹)" required error={errors.price?.message}>
            <input type="number" {...register('price', { valueAsNumber: true })} placeholder="1999" className={inputCls(errors.price)} />
          </FField>
          <FField label="Discount Price" error={errors.discountPrice?.message}>
            <input type="number" {...register('discountPrice', { setValueAs: (v) => v === '' ? undefined : Number(v) })} placeholder="1599" className={inputCls(errors.discountPrice)} />
          </FField>
          <FField label="Color">
            <input {...register('color')} placeholder="Black" className={inputCls()} />
          </FField>
          <FField label="Material">
            <input {...register('material')} placeholder="Leather" className={inputCls()} />
          </FField>
        </div>

        {/* Tags + Featured */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <FField label="Tags (comma-separated)">
            <input {...register('tags')} placeholder="running, sports, men" className={inputCls()} />
          </FField>
          <FField label="Featured">
            <label className="flex items-center gap-2 h-10 cursor-pointer">
              <input type="checkbox" {...register('isFeatured')} className="w-4 h-4 accent-[#ff6b35]" />
              <span className="font-body text-sm text-textSecondary">Mark as featured product</span>
            </label>
          </FField>
        </div>

        {/* Sizes */}
        <div>
          <p className="font-body text-xs font-semibold text-textSecondary mb-2">
            Sizes & Stock <span className="text-red-400">*</span>
            <span className="text-textMuted ml-1">(click size to add)</span>
          </p>
          <SizeManager sizes={sizes} onChange={setSizes} />
        </div>

        {/* Images */}
        <div>
          <p className="font-body text-xs font-semibold text-textSecondary mb-2">
            Product Images {!isEdit && <span className="text-red-400">*</span>}
          </p>
          <ImageZone
            existingImages={existingImages}
            newFiles={newFiles}
            onAddFiles={(files) => setNewFiles((prev) => [...prev, ...files])}
            onRemoveExisting={(pid) => {
              setExistingImages((prev) => prev.filter((i) => i.publicId !== pid));
              setRemovedIds((prev) => [...prev, pid]);
            }}
            onRemoveNew={(idx) => setNewFiles((prev) => prev.filter((_, i) => i !== idx))}
          />
        </div>

        {/* Submit */}
        <motion.button
          type="submit"
          disabled={isSubmitting}
          whileHover={{ scale: 1.01 }}
          whileTap={{ scale: 0.99 }}
          className="w-full py-3.5 rounded-xl bg-accent text-white font-body font-semibold hover:bg-orange-600 transition-colors duration-200 disabled:opacity-55"
        >
          {isSubmitting ? 'Saving…' : isEdit ? 'Update Product' : 'Create Product'}
        </motion.button>
      </form>
    </Modal>
  );
}

// ── Confirm modal ──────────────────────────────────────────────────────────────

function ConfirmModal({ title, message, confirmLabel, onConfirm, onClose, danger }) {
  return (
    <Modal open onClose={onClose} title={title} size="sm">
      <p className="font-body text-sm text-textSecondary mb-5">{message}</p>
      <div className="flex gap-3">
        <button onClick={onClose} className="flex-1 py-2.5 rounded-xl border border-border font-body text-sm text-textSecondary hover:border-accent transition-all duration-200">Cancel</button>
        <motion.button
          whileHover={{ scale: 1.01 }}
          whileTap={{ scale: 0.99 }}
          onClick={onConfirm}
          className={cn('flex-1 py-2.5 rounded-xl font-body font-semibold text-sm transition-colors duration-200', danger ? 'bg-red-500 text-white hover:bg-red-600' : 'bg-accent text-white hover:bg-orange-600')}
        >
          {confirmLabel || 'Confirm'}
        </motion.button>
      </div>
    </Modal>
  );
}

// ── Stock badge ────────────────────────────────────────────────────────────────

function StockBadge({ sizes = [] }) {
  const total = sizes.reduce((a, s) => a + (s.stock || 0), 0);
  if (total === 0) return <span className="inline-flex px-2 py-0.5 rounded-full text-[10px] font-body font-bold border bg-red-50 text-red-600 border-red-200">Out of Stock</span>;
  if (total <= 10) return <span className="inline-flex px-2 py-0.5 rounded-full text-[10px] font-body font-bold border bg-amber-50 text-amber-700 border-amber-200">Low ({total})</span>;
  return <span className="inline-flex px-2 py-0.5 rounded-full text-[10px] font-body font-bold border bg-emerald-50 text-emerald-700 border-emerald-200">In Stock ({total})</span>;
}

// ── Main page ──────────────────────────────────────────────────────────────────

export default function AdminProductsPage() {
  const queryClient = useQueryClient();
  const [productModal, setProductModal] = useState(null); // null | 'new' | product object
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [page, setPage] = useState(1);

  const { data, isLoading } = useQuery({
    queryKey: ['admin-products', page],
    queryFn: () => api.get('/products', { params: { page, limit: 20, sortBy: 'newest' } }).then((r) => r.data.data),
    keepPreviousData: true,
  });

  const products = data?.products || [];

  const toggleMutation = useMutation({
    mutationFn: ({ id, isActive }) => isActive
      ? api.delete(`/products/${id}`)
      : api.put(`/products/${id}`, { isActive: true }),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['admin-products'] }); toast.success('Product updated'); },
    onError: () => toast.error('Failed to update product'),
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => api.delete(`/products/${id}`),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['admin-products'] }); toast.success('Product deactivated'); setDeleteTarget(null); },
    onError: () => toast.error('Failed to deactivate'),
  });

  return (
    <div className="p-6 md:p-8 min-h-screen">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="font-display text-2xl text-textPrimary">Products</h1>
          <p className="font-body text-xs text-textSecondary mt-0.5">{data?.totalCount || 0} active products</p>
        </div>
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={() => setProductModal('new')}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-accent text-white font-body font-semibold text-sm hover:bg-orange-600 transition-colors duration-200"
        >
          <Plus size={16} strokeWidth={2} />
          Add Product
        </motion.button>
      </div>

      {/* Table */}
      <div className="bg-surface border border-border rounded-2xl overflow-hidden mb-5">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="border-b border-border">
              <tr>
                {['Image', 'Name', 'Category', 'Price', 'Stock', 'Active', 'Actions'].map((h) => (
                  <th key={h} className="px-4 py-3 font-body text-[10px] font-semibold text-textMuted uppercase tracking-widest whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                Array.from({ length: 8 }).map((_, i) => (
                  <tr key={i} className="border-b border-border/40">
                    {Array.from({ length: 7 }).map((_, j) => <td key={j} className="px-4 py-3"><div className="h-4 rounded bg-surface2 animate-pulse w-16" /></td>)}
                  </tr>
                ))
              ) : products.length === 0 ? (
                <tr><td colSpan={7} className="px-4 py-16 text-center font-body text-sm text-textMuted">No products found</td></tr>
              ) : (
                products.map((p) => (
                  <tr key={p._id} className="border-b border-border/40 hover:bg-background transition-colors">
                    <td className="px-4 py-3">
                      <div className="w-10 h-10 rounded-xl bg-surface2 border border-border overflow-hidden shrink-0">
                        {p.images?.[0]?.url && <img src={p.images[0].url} alt="" className="w-full h-full object-cover" />}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <p className="font-body text-sm text-textPrimary max-w-[160px] line-clamp-1">{p.name}</p>
                      <p className="font-body text-[10px] text-textMuted capitalize">{p.brand}</p>
                    </td>
                    <td className="px-4 py-3 font-body text-xs text-textSecondary capitalize">{p.category} / {p.subCategory}</td>
                    <td className="px-4 py-3">
                      <p className="font-mono text-xs text-accent font-semibold">{formatPrice(p.discountPrice || p.price)}</p>
                      {p.discountPrice && <p className="font-mono text-[10px] text-textMuted line-through">{formatPrice(p.price)}</p>}
                    </td>
                    <td className="px-4 py-3"><StockBadge sizes={p.sizes} /></td>
                    <td className="px-4 py-3">
                      <button
                        onClick={() => toggleMutation.mutate({ id: p._id, isActive: p.isActive })}
                        className={cn('w-10 h-6 rounded-full transition-all duration-300 relative shrink-0', p.isActive ? 'bg-accent3' : 'bg-border')}
                      >
                        <span className={cn('absolute top-1 w-4 h-4 rounded-full bg-white shadow transition-all duration-300', p.isActive ? 'left-5' : 'left-1')} />
                      </button>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1.5">
                        <button
                          onClick={() => setProductModal(p)}
                          className="p-1.5 rounded-lg border border-border text-textMuted hover:border-accent hover:text-accent transition-all duration-200"
                        >
                          <Edit2 size={13} strokeWidth={1.8} />
                        </button>
                        <button
                          onClick={() => setDeleteTarget(p)}
                          className="p-1.5 rounded-lg border border-border text-textMuted hover:border-red-400 hover:text-red-400 transition-all duration-200"
                        >
                          <PowerOff size={13} strokeWidth={1.8} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Pagination */}
      {data?.totalPages > 1 && (
        <div className="flex justify-center">
          <div className="flex items-center gap-2 font-body text-sm">
            <button disabled={page === 1} onClick={() => setPage((p) => p - 1)} className="px-3 py-1.5 rounded-xl border border-border text-textSecondary hover:border-accent hover:text-accent disabled:opacity-40 transition-all duration-200">← Prev</button>
            <span className="text-textMuted">{page} / {data.totalPages}</span>
            <button disabled={page === data.totalPages} onClick={() => setPage((p) => p + 1)} className="px-3 py-1.5 rounded-xl border border-border text-textSecondary hover:border-accent hover:text-accent disabled:opacity-40 transition-all duration-200">Next →</button>
          </div>
        </div>
      )}

      {/* Product modal */}
      {productModal && (
        <ProductModal
          product={productModal === 'new' ? null : productModal}
          onClose={() => setProductModal(null)}
          onSuccess={() => setProductModal(null)}
        />
      )}

      {/* Confirm deactivate */}
      {deleteTarget && (
        <ConfirmModal
          title="Deactivate Product"
          message={`Deactivate "${deleteTarget.name}"? It will be hidden from the shop.`}
          confirmLabel="Deactivate"
          danger
          onConfirm={() => deleteMutation.mutate(deleteTarget._id)}
          onClose={() => setDeleteTarget(null)}
        />
      )}
    </div>
  );
}
