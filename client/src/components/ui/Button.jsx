import { motion } from 'framer-motion';
import { Loader2 } from 'lucide-react';
import { cn } from '../../lib/utils';

const variantStyles = {
  primary:   'bg-accent text-white border-2 border-accent hover:bg-orange-600 hover:border-orange-600',
  secondary: 'bg-accent2 text-white border-2 border-accent2 hover:bg-violet-800 hover:border-violet-800',
  outline:   'border-2 border-accent text-accent bg-transparent hover:bg-accent hover:text-white',
  ghost:     'border-2 border-transparent text-textPrimary bg-transparent hover:bg-surface2',
  danger:    'bg-red-500 text-white border-2 border-red-500 hover:bg-red-600 hover:border-red-600',
};

const sizeStyles = {
  sm: 'px-3.5 py-1.5 text-sm gap-1.5',
  md: 'px-5 py-2.5 text-base gap-2',
  lg: 'px-7 py-3.5 text-lg gap-2.5',
};

const iconSizes = { sm: 14, md: 16, lg: 20 };

export default function Button({
  variant = 'primary',
  size = 'md',
  loading = false,
  disabled = false,
  icon,
  children,
  className,
  onClick,
  type = 'button',
  ...props
}) {
  const isDisabled = disabled || loading;

  return (
    <motion.button
      type={type}
      onClick={onClick}
      disabled={isDisabled}
      whileHover={!isDisabled ? { scale: 1.02 } : {}}
      whileTap={!isDisabled ? { scale: 0.98 } : {}}
      transition={{ type: 'spring', stiffness: 400, damping: 25 }}
      className={cn(
        'inline-flex items-center justify-center rounded-xl font-body font-medium tracking-wide',
        'transition-colors duration-200 select-none cursor-pointer',
        variantStyles[variant],
        sizeStyles[size],
        isDisabled && 'opacity-50 cursor-not-allowed pointer-events-none',
        className
      )}
      {...props}
    >
      {loading ? (
        <Loader2
          className="animate-spin"
          size={iconSizes[size]}
          strokeWidth={2.5}
        />
      ) : (
        <>
          {icon && <span className="shrink-0">{icon}</span>}
          {children}
        </>
      )}
    </motion.button>
  );
}
