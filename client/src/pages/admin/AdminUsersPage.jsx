import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { Search } from 'lucide-react';
import api from '../../lib/axios';
import { toast } from '../../lib/toast';
import { formatDate, cn } from '../../lib/utils';
import { Modal } from '../../components/ui';

// ── Confirm modal ──────────────────────────────────────────────────────────────

function ConfirmModal({ open, title, message, confirmLabel, onConfirm, onClose, danger, isPending }) {
  return (
    <Modal open={open} onClose={onClose} title={title} size="sm">
      <p className="font-body text-sm text-textSecondary mb-5">{message}</p>
      <div className="flex gap-3">
        <button onClick={onClose} className="flex-1 py-2.5 rounded-xl border border-border font-body text-sm text-textSecondary hover:border-accent transition-all">Cancel</button>
        <motion.button
          whileHover={{ scale: 1.01 }}
          whileTap={{ scale: 0.99 }}
          disabled={isPending}
          onClick={onConfirm}
          className={cn('flex-1 py-2.5 rounded-xl font-body font-semibold text-sm transition-colors disabled:opacity-55', danger ? 'bg-red-500 text-white hover:bg-red-600' : 'bg-accent2 text-white hover:bg-violet-800')}
        >
          {isPending ? 'Working…' : confirmLabel}
        </motion.button>
      </div>
    </Modal>
  );
}

// ── Main page ──────────────────────────────────────────────────────────────────

export default function AdminUsersPage() {
  const queryClient = useQueryClient();

  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [roleModal, setRoleModal] = useState(null);   // user object
  const [deactivateModal, setDeactivateModal] = useState(null); // user object
  const [page, setPage] = useState(1);

  // Debounce search
  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), 400);
    return () => clearTimeout(t);
  }, [search]);

  // Reset page on search change
  useEffect(() => { setPage(1); }, [debouncedSearch]);

  const { data, isLoading } = useQuery({
    queryKey: ['admin-users', debouncedSearch, page],
    queryFn: () =>
      api.get('/admin/users', { params: { search: debouncedSearch || undefined, page, limit: 20 } })
        .then((r) => r.data.data),
    keepPreviousData: true,
  });

  const users = data?.users || [];

  // Change role
  const roleMutation = useMutation({
    mutationFn: ({ userId, role }) => api.put(`/admin/users/${userId}/role`, { role }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-users'] });
      toast.success('Role updated');
      setRoleModal(null);
    },
    onError: (err) => toast.error(err.response?.data?.message || 'Failed to update role'),
  });

  // Deactivate
  const deactivateMutation = useMutation({
    mutationFn: (userId) => api.delete(`/admin/users/${userId}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-users'] });
      toast.success('User deactivated');
      setDeactivateModal(null);
    },
    onError: (err) => toast.error(err.response?.data?.message || 'Failed to deactivate'),
  });

  return (
    <div className="p-6 md:p-8 min-h-screen">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="font-display text-2xl text-textPrimary">Users</h1>
          <p className="font-body text-xs text-textSecondary mt-0.5">{data?.totalCount || 0} registered users</p>
        </div>

        {/* Search */}
        <div className="relative">
          <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-textMuted" strokeWidth={1.8} />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search name or email…"
            className="pl-10 pr-4 py-2.5 rounded-xl border border-border bg-background font-body text-sm text-textPrimary placeholder:text-textMuted outline-none focus:border-accent transition-colors duration-200 w-64"
          />
        </div>
      </div>

      {/* Table */}
      <div className="bg-surface border border-border rounded-2xl overflow-hidden mb-5">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="border-b border-border">
              <tr>
                {['User', 'Email', 'Phone', 'Role', 'Joined', 'Actions'].map((h) => (
                  <th key={h} className="px-4 py-3 font-body text-[10px] font-semibold text-textMuted uppercase tracking-widest whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                Array.from({ length: 8 }).map((_, i) => (
                  <tr key={i} className="border-b border-border/40">
                    {Array.from({ length: 6 }).map((_, j) => <td key={j} className="px-4 py-3"><div className="h-4 rounded bg-surface2 animate-pulse w-20" /></td>)}
                  </tr>
                ))
              ) : users.length === 0 ? (
                <tr><td colSpan={6} className="px-4 py-16 text-center font-body text-sm text-textMuted">No users found</td></tr>
              ) : (
                users.map((user) => (
                  <tr key={user._id} className="border-b border-border/40 hover:bg-background transition-colors">
                    {/* Avatar + name */}
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className={cn(
                          'w-8 h-8 rounded-full flex items-center justify-center font-display text-sm font-bold shrink-0',
                          user.role === 'admin' ? 'bg-accent2/15 text-accent2' : 'bg-accent/12 text-accent'
                        )}>
                          {user.name?.charAt(0)?.toUpperCase() || '?'}
                        </div>
                        <p className="font-body text-sm text-textPrimary max-w-[120px] truncate">{user.name}</p>
                      </div>
                    </td>

                    <td className="px-4 py-3 font-body text-xs text-textSecondary max-w-[180px] truncate">{user.email}</td>
                    <td className="px-4 py-3 font-mono text-xs text-textSecondary">{user.phone || '—'}</td>

                    {/* Role badge */}
                    <td className="px-4 py-3">
                      <span className={cn(
                        'inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-body font-bold uppercase tracking-wide border',
                        user.role === 'admin'
                          ? 'bg-violet-50 text-violet-700 border-violet-200'
                          : 'bg-surface2 text-textMuted border-border'
                      )}>
                        {user.role}
                      </span>
                    </td>

                    <td className="px-4 py-3 font-body text-xs text-textMuted whitespace-nowrap">{formatDate(user.createdAt)}</td>

                    {/* Actions */}
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1.5">
                        <button
                          onClick={() => setRoleModal(user)}
                          className="px-2.5 py-1.5 rounded-xl border border-border font-body text-[10px] font-semibold text-textSecondary hover:border-accent2 hover:text-accent2 transition-all duration-200 whitespace-nowrap"
                        >
                          Change Role
                        </button>
                        <button
                          onClick={() => setDeactivateModal(user)}
                          className="px-2.5 py-1.5 rounded-xl border border-border font-body text-[10px] font-semibold text-textSecondary hover:border-red-400 hover:text-red-500 transition-all duration-200"
                        >
                          Deactivate
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
        <div className="flex items-center justify-center gap-2 font-body text-sm">
          <button disabled={page === 1} onClick={() => setPage((p) => p - 1)} className="px-3 py-1.5 rounded-xl border border-border text-textSecondary hover:border-accent hover:text-accent disabled:opacity-40 transition-all duration-200">← Prev</button>
          <span className="text-textMuted">{page} / {data.totalPages}</span>
          <button disabled={page === data.totalPages} onClick={() => setPage((p) => p + 1)} className="px-3 py-1.5 rounded-xl border border-border text-textSecondary hover:border-accent hover:text-accent disabled:opacity-40 transition-all duration-200">Next →</button>
        </div>
      )}

      {/* Role change modal */}
      {roleModal && (
        <Modal open onClose={() => setRoleModal(null)} title="Change Role" size="sm">
          <p className="font-body text-sm text-textSecondary mb-5">
            Change role for <strong>{roleModal.name}</strong> (currently <em>{roleModal.role}</em>)?
          </p>
          <div className="grid grid-cols-2 gap-3">
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              disabled={roleModal.role === 'user' || roleMutation.isPending}
              onClick={() => roleMutation.mutate({ userId: roleModal._id, role: 'user' })}
              className="py-3 rounded-xl border-2 border-border font-body font-semibold text-sm text-textSecondary hover:border-accent hover:text-accent disabled:opacity-40 transition-all duration-200"
            >
              Make User
            </motion.button>
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              disabled={roleModal.role === 'admin' || roleMutation.isPending}
              onClick={() => roleMutation.mutate({ userId: roleModal._id, role: 'admin' })}
              className="py-3 rounded-xl border-2 border-accent2 bg-accent2/8 font-body font-semibold text-sm text-accent2 hover:bg-accent2/15 disabled:opacity-40 transition-all duration-200"
            >
              Make Admin
            </motion.button>
          </div>
        </Modal>
      )}

      {/* Deactivate confirmation */}
      <ConfirmModal
        open={!!deactivateModal}
        title="Deactivate User"
        message={`Deactivate "${deactivateModal?.name}"? They will be signed out and unable to log in.`}
        confirmLabel="Deactivate"
        danger
        isPending={deactivateMutation.isPending}
        onConfirm={() => deactivateMutation.mutate(deactivateModal._id)}
        onClose={() => setDeactivateModal(null)}
      />
    </div>
  );
}
