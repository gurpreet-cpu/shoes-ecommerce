import { motion } from 'framer-motion';
import { cn } from '../../lib/utils';

function Spinner({ size = 24, className }) {
  return (
    <motion.div
      animate={{ rotate: 360 }}
      transition={{ repeat: Infinity, duration: 0.8, ease: 'linear' }}
      className={cn('inline-block', className)}
      style={{ width: size, height: size }}
    >
      <svg
        width={size}
        height={size}
        viewBox="0 0 24 24"
        fill="none"
        className="text-accent"
      >
        <circle
          cx="12" cy="12" r="10"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeOpacity="0.2"
        />
        <path
          d="M12 2a10 10 0 0 1 10 10"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinecap="round"
        />
      </svg>
    </motion.div>
  );
}

function Dots({ size = 8, className }) {
  return (
    <div className={cn('flex items-center gap-1.5', className)}>
      {[0, 1, 2].map((i) => (
        <motion.div
          key={i}
          className="rounded-full bg-accent"
          style={{ width: size, height: size }}
          animate={{ y: [0, -size * 0.8, 0] }}
          transition={{
            repeat: Infinity,
            duration: 0.7,
            delay: i * 0.15,
            ease: 'easeInOut',
          }}
        />
      ))}
    </div>
  );
}

function Pulse({ size = 32, className }) {
  return (
    <div className={cn('relative flex items-center justify-center', className)} style={{ width: size, height: size }}>
      <motion.div
        className="absolute rounded-full bg-accent/20"
        animate={{ scale: [1, 1.8], opacity: [0.5, 0] }}
        transition={{ repeat: Infinity, duration: 1.2, ease: 'easeOut' }}
        style={{ width: size, height: size }}
      />
      <div
        className="rounded-full bg-accent"
        style={{ width: size * 0.45, height: size * 0.45 }}
      />
    </div>
  );
}

export default function LoadingSpinner({ variant = 'spinner', size, className }) {
  if (variant === 'dots') return <Dots size={size} className={className} />;
  if (variant === 'pulse') return <Pulse size={size} className={className} />;
  return <Spinner size={size} className={className} />;
}
