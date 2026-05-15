import { cn } from '../../lib/utils';

const variantStyles = {
  default: 'bg-surface2 text-textSecondary border border-border',
  success: 'bg-emerald-50 text-emerald-700 border border-emerald-200',
  warning: 'bg-amber-50 text-amber-700 border border-amber-200',
  error:   'bg-red-50 text-red-600 border border-red-200',
  accent:  'bg-orange-50 text-accent border border-orange-200',
  purple:  'bg-violet-50 text-accent2 border border-violet-200',
};

export default function Badge({ variant = 'default', children, className }) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full px-2.5 py-0.5',
        'text-xs font-body font-bold tracking-wide uppercase',
        variantStyles[variant],
        className
      )}
    >
      {children}
    </span>
  );
}
