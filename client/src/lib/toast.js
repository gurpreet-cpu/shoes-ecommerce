import { toast as sonner } from 'sonner';

const baseStyle = {
  background: '#f5f4f0',
  border: '1px solid #e0ddd8',
  color: '#1a1816',
  fontFamily: 'Satoshi, sans-serif',
  borderRadius: '12px',
  boxShadow: '0 4px 24px rgba(26,24,22,0.08)',
};

export const toast = {
  success: (message, options) =>
    sonner.success(message, {
      style: { ...baseStyle, borderLeft: '3px solid #06d6a0' },
      ...options,
    }),

  error: (message, options) =>
    sonner.error(message, {
      style: { ...baseStyle, borderLeft: '3px solid #ef4444' },
      ...options,
    }),

  loading: (message, options) =>
    sonner.loading(message, {
      style: { ...baseStyle, borderLeft: '3px solid #ff6b35' },
      ...options,
    }),

  info: (message, options) =>
    sonner(message, {
      style: { ...baseStyle, borderLeft: '3px solid #7c3aed' },
      ...options,
    }),

  dismiss: sonner.dismiss,
  promise: sonner.promise,
};
