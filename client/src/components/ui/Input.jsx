import { forwardRef, useId, useState } from 'react';
import { motion } from 'framer-motion';
import { cn } from '../../lib/utils';

const Input = forwardRef(function Input(
  { label, error, icon: Icon, type = 'text', placeholder, className, onChange, value, ...props },
  ref
) {
  const id = useId();
  const [focused, setFocused] = useState(false);
  const [internalValue, setInternalValue] = useState('');

  const controlledValue = value !== undefined ? value : internalValue;
  const isLifted = focused || String(controlledValue).length > 0;

  function handleChange(e) {
    if (value === undefined) setInternalValue(e.target.value);
    onChange?.(e);
  }

  return (
    <div className={cn('relative flex flex-col gap-1', className)}>
      <div className="relative">
        {/* Floating label */}
        {label && (
          <motion.label
            htmlFor={id}
            initial={false}
            animate={
              isLifted
                ? { top: -10, fontSize: '0.72rem', color: focused ? '#ff6b35' : '#6b6760' }
                : { top: Icon ? 14 : 14, fontSize: '0.9rem', color: '#6b6760' }
            }
            transition={{ type: 'spring', stiffness: 400, damping: 30 }}
            className={cn(
              'absolute z-10 pointer-events-none font-body leading-none bg-background px-1',
              Icon ? 'left-9' : 'left-4'
            )}
          >
            {label}
          </motion.label>
        )}

        {/* Icon */}
        {Icon && (
          <span className={cn(
            'absolute left-3 top-1/2 -translate-y-1/2 transition-colors duration-200',
            focused ? 'text-accent' : 'text-textSecondary'
          )}>
            <Icon size={16} strokeWidth={2} />
          </span>
        )}

        {/* Input */}
        <input
          id={id}
          ref={ref}
          type={type}
          value={controlledValue}
          placeholder={focused ? placeholder : ''}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          onChange={handleChange}
          className={cn(
            'w-full rounded-xl border bg-surface font-body text-textPrimary',
            'py-3.5 transition-all duration-200 outline-none placeholder:text-textSecondary/60',
            Icon ? 'pl-9 pr-4' : 'px-4',
            focused
              ? 'border-accent shadow-sm shadow-accent/20'
              : error
              ? 'border-red-400'
              : 'border-border',
          )}
          {...props}
        />
      </div>

      {/* Error message */}
      {error && (
        <motion.p
          initial={{ opacity: 0, y: -4 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-xs font-body text-red-500 pl-1"
        >
          {error}
        </motion.p>
      )}
    </div>
  );
});

export default Input;
