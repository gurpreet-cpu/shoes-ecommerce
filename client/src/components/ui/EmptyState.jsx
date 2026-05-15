import { motion } from 'framer-motion';
import Button from './Button';
import { cn } from '../../lib/utils';

export default function EmptyState({ icon: Icon, title, description, action, className }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: 'easeOut' }}
      className={cn('flex flex-col items-center justify-center text-center py-16 px-6', className)}
    >
      {Icon && (
        <div className="mb-5 p-5 rounded-2xl bg-surface2 text-textSecondary/40">
          <Icon size={48} strokeWidth={1.2} />
        </div>
      )}

      <h3 className="font-display text-2xl text-textPrimary mb-2">{title}</h3>

      {description && (
        <p className="font-body text-textSecondary text-sm max-w-xs mb-6">{description}</p>
      )}

      {action && (
        <Button
          variant={action.variant || 'primary'}
          onClick={action.onClick}
          icon={action.icon}
        >
          {action.label}
        </Button>
      )}
    </motion.div>
  );
}
