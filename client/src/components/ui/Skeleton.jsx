import { motion } from 'framer-motion';
import { cn } from '../../lib/utils';

export default function Skeleton({ width, height, rounded = 'rounded-lg', className }) {
  return (
    <div
      className={cn('relative overflow-hidden bg-surface2', rounded, className)}
      style={{ width, height }}
    >
      <motion.div
        className="absolute inset-0"
        style={{
          background:
            'linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.6) 50%, transparent 100%)',
        }}
        animate={{ x: ['-100%', '100%'] }}
        transition={{ repeat: Infinity, duration: 1.5, ease: 'linear' }}
      />
    </div>
  );
}
