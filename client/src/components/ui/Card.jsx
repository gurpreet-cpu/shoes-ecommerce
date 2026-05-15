import { motion } from 'framer-motion';
import { cn } from '../../lib/utils';

export default function Card({
  children,
  hover = false,
  className,
  layoutId,
  onClick,
  ...props
}) {
  const Component = hover || layoutId ? motion.div : 'div';

  const motionProps = hover
    ? {
        whileHover: {
          scale: 1.01,
          boxShadow: '0 12px 40px rgba(26,24,22,0.10)',
        },
        transition: { type: 'spring', stiffness: 300, damping: 25 },
      }
    : {};

  return (
    <Component
      layoutId={layoutId}
      onClick={onClick}
      className={cn(
        'bg-surface rounded-2xl border border-border',
        hover && 'cursor-pointer',
        className
      )}
      {...motionProps}
      {...props}
    >
      {children}
    </Component>
  );
}
