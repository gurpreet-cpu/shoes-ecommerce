import { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';
import { cn } from '../../lib/utils';

const sideConfig = {
  right: {
    className: 'fixed right-0 top-0 h-full w-full max-w-[420px]',
    initial: { x: '100%' },
    animate: { x: 0 },
    exit: { x: '100%' },
  },
  left: {
    className: 'fixed left-0 top-0 h-full w-full max-w-[420px]',
    initial: { x: '-100%' },
    animate: { x: 0 },
    exit: { x: '-100%' },
  },
  bottom: {
    className: 'fixed bottom-0 left-0 right-0 w-full max-h-[85vh] rounded-t-3xl',
    initial: { y: '100%' },
    animate: { y: 0 },
    exit: { y: '100%' },
  },
};

function DrawerInner({ open, onClose, side = 'right', children, title }) {
  const config = sideConfig[side];

  // Lock body scroll
  useEffect(() => {
    if (open) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => { document.body.style.overflow = ''; };
  }, [open]);

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Backdrop */}
          <motion.div
            key="drawer-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm"
            onClick={onClose}
          />

          {/* Panel */}
          <motion.div
            key="drawer-panel"
            initial={config.initial}
            animate={config.animate}
            exit={config.exit}
            transition={{ type: 'spring', stiffness: 320, damping: 32 }}
            className={cn(
              config.className,
              'z-50 bg-background border-border flex flex-col overflow-hidden',
              side === 'right' && 'border-l',
              side === 'left'  && 'border-r',
              side === 'bottom' && 'border-t',
            )}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-border shrink-0">
              {title ? (
                <h2 className="font-display text-lg text-textPrimary">{title}</h2>
              ) : (
                <span />
              )}
              <button
                onClick={onClose}
                className="p-1.5 rounded-lg text-textSecondary hover:text-textPrimary hover:bg-surface2 transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            {/* Scrollable content */}
            <div className="flex-1 overflow-y-auto">
              {children}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

export default function Drawer(props) {
  return createPortal(<DrawerInner {...props} />, document.body);
}
