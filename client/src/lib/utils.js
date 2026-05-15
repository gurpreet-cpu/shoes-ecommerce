import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { format } from 'date-fns';

export function cn(...inputs) {
  return twMerge(clsx(inputs));
}

export function formatPrice(price) {
  return `₹${Number(price).toLocaleString('en-IN')}`;
}

export function formatDate(date) {
  return format(new Date(date), 'd MMM yyyy');
}

export function getDiscountPercent(original, sale) {
  if (!original || !sale || sale >= original) return null;
  const percent = Math.round(((original - sale) / original) * 100);
  return `${percent}% OFF`;
}

export function truncate(str, length = 80) {
  if (!str || str.length <= length) return str;
  return `${str.slice(0, length)}…`;
}
