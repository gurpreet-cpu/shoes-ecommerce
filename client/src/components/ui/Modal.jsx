import * as Dialog from '@radix-ui/react-dialog';
import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';
import { cn } from '../../lib/utils';

const sizeStyles = {
  sm: 'max-w-sm',
  md: 'max-w-md',
  lg: 'max-w-lg',
  xl: 'max-w-xl',
};

export default function Modal({ open, onClose, title, children, size = 'md' }) {
  return (
    <Dialog.Root open={open} onOpenChange={(v) => !v && onClose?.()}>
      <Dialog.Portal forceMount>
        <AnimatePresence>
          {open && (
            <>
              {/* Backdrop */}
              <Dialog.Overlay asChild>
                <motion.div
                  key="modal-backdrop"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.18 }}
                  className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm"
                />
              </Dialog.Overlay>

              {/* Content */}
              <Dialog.Content asChild onEscapeKeyDown={onClose}>
                <motion.div
                  key="modal-content"
                  initial={{ opacity: 0, y: 48, scale: 0.96 }}
                  animate={{
                    opacity: 1, y: 0, scale: 1,
                    transition: { type: 'spring', stiffness: 320, damping: 28 },
                  }}
                  exit={{
                    opacity: 0, y: 24, scale: 0.97,
                    transition: { duration: 0.16 },
                  }}
                  className={cn(
                    'fixed left-1/2 top-1/2 z-50 -translate-x-1/2 -translate-y-1/2',
                    'w-[calc(100vw-2rem)] bg-background rounded-3xl border border-border p-6 shadow-2xl',
                    sizeStyles[size]
                  )}
                >
                  {/* Header */}
                  {title && (
                    <div className="flex items-center justify-between mb-5">
                      <Dialog.Title className="font-display text-xl text-textPrimary">
                        {title}
                      </Dialog.Title>
                      <button
                        onClick={onClose}
                        className="p-1.5 rounded-lg text-textSecondary hover:text-textPrimary hover:bg-surface2 transition-colors"
                      >
                        <X size={18} />
                      </button>
                    </div>
                  )}

                  {!title && (
                    <button
                      onClick={onClose}
                      className="absolute top-4 right-4 p-1.5 rounded-lg text-textSecondary hover:text-textPrimary hover:bg-surface2 transition-colors"
                    >
                      <X size={18} />
                    </button>
                  )}

                  {children}
                </motion.div>
              </Dialog.Content>
            </>
          )}
        </AnimatePresence>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
