import { motion } from 'framer-motion';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '../../lib/utils';

export default function Pagination({ currentPage, totalPages, onPageChange }) {
  if (totalPages <= 1) return null;

  const pages = Array.from({ length: totalPages }, (_, i) => i + 1);

  // Show max 5 page numbers with ellipsis logic
  const getVisiblePages = () => {
    if (totalPages <= 5) return pages;
    if (currentPage <= 3) return [...pages.slice(0, 4), '...', totalPages];
    if (currentPage >= totalPages - 2) return [1, '...', ...pages.slice(-4)];
    return [1, '...', currentPage - 1, currentPage, currentPage + 1, '...', totalPages];
  };

  const visiblePages = getVisiblePages();

  return (
    <div className="flex items-center gap-1.5 font-body">
      {/* Prev */}
      <motion.button
        whileHover={{ scale: 1.08 }}
        whileTap={{ scale: 0.94 }}
        onClick={() => onPageChange(currentPage - 1)}
        disabled={currentPage === 1}
        className={cn(
          'flex items-center gap-1 px-3 py-2 rounded-lg text-sm transition-colors',
          currentPage === 1
            ? 'text-textSecondary/40 cursor-not-allowed'
            : 'text-textSecondary hover:bg-surface2 hover:text-textPrimary'
        )}
      >
        <ChevronLeft size={14} />
        Prev
      </motion.button>

      {/* Page numbers */}
      {visiblePages.map((page, i) =>
        page === '...' ? (
          <span key={`ellipsis-${i}`} className="px-2 text-textSecondary text-sm select-none">
            …
          </span>
        ) : (
          <motion.button
            key={page}
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.92 }}
            onClick={() => onPageChange(page)}
            className={cn(
              'w-8 h-8 rounded-lg text-sm font-medium transition-colors',
              page === currentPage
                ? 'bg-accent text-white'
                : 'text-textSecondary hover:bg-surface2 hover:text-textPrimary'
            )}
          >
            {page}
          </motion.button>
        )
      )}

      {/* Next */}
      <motion.button
        whileHover={{ scale: 1.08 }}
        whileTap={{ scale: 0.94 }}
        onClick={() => onPageChange(currentPage + 1)}
        disabled={currentPage === totalPages}
        className={cn(
          'flex items-center gap-1 px-3 py-2 rounded-lg text-sm transition-colors',
          currentPage === totalPages
            ? 'text-textSecondary/40 cursor-not-allowed'
            : 'text-textSecondary hover:bg-surface2 hover:text-textPrimary'
        )}
      >
        Next
        <ChevronRight size={14} />
      </motion.button>
    </div>
  );
}
