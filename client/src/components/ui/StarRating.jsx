import { useState } from 'react';
import { motion } from 'framer-motion';
import { Star } from 'lucide-react';
import { cn } from '../../lib/utils';

function StarIcon({ filled, half, size }) {
  if (half) {
    return (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
        {/* Left half filled */}
        <defs>
          <linearGradient id="half-fill">
            <stop offset="50%" stopColor="#f59e0b" />
            <stop offset="50%" stopColor="transparent" />
          </linearGradient>
        </defs>
        <Star
          size={size}
          fill="url(#half-fill)"
          stroke="#f59e0b"
          strokeWidth={1.5}
        />
      </svg>
    );
  }
  return (
    <Star
      size={size}
      fill={filled ? '#f59e0b' : 'none'}
      stroke={filled ? '#f59e0b' : '#c8c4be'}
      strokeWidth={1.5}
    />
  );
}

export default function StarRating({
  rating = 0,
  count,
  size = 16,
  interactive = false,
  onChange,
  className,
}) {
  const [hovered, setHovered] = useState(0);

  const displayRating = interactive && hovered ? hovered : rating;

  return (
    <div className={cn('flex items-center gap-1', className)}>
      <div className="flex items-center gap-0.5">
        {[1, 2, 3, 4, 5].map((star) => {
          const filled = displayRating >= star;
          const half = !filled && displayRating >= star - 0.5;

          return (
            <motion.button
              key={star}
              type="button"
              whileHover={interactive ? { scale: 1.25 } : {}}
              whileTap={interactive ? { scale: 0.9 } : {}}
              transition={{ type: 'spring', stiffness: 500, damping: 20 }}
              onMouseEnter={() => interactive && setHovered(star)}
              onMouseLeave={() => interactive && setHovered(0)}
              onClick={() => interactive && onChange?.(star)}
              className={cn(
                'leading-none',
                interactive ? 'cursor-pointer' : 'cursor-default pointer-events-none'
              )}
              style={{ lineHeight: 0 }}
            >
              <StarIcon filled={filled} half={half} size={size} />
            </motion.button>
          );
        })}
      </div>

      {count !== undefined && (
        <span className="font-body text-xs text-textSecondary ml-1">
          ({count.toLocaleString()})
        </span>
      )}
    </div>
  );
}
