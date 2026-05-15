import { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { motion, AnimatePresence } from 'framer-motion';
import { Eye, EyeOff, Mail, Lock, User, Phone } from 'lucide-react';
import { useDispatch } from 'react-redux';
import { setCredentials } from '../store/authSlice';
import api from '../lib/axios';
import { toast } from '../lib/toast';
import { cn } from '../lib/utils';

// ── Schemas ────────────────────────────────────────────────────────────────────

const loginSchema = z.object({
  email: z.string().email('Enter a valid email address'),
  password: z.string().min(8, 'Minimum 8 characters'),
});

const registerSchema = z.object({
  name: z.string().min(2, 'At least 2 characters required'),
  email: z.string().email('Enter a valid email address'),
  phone: z.string().regex(/^\d{10}$/, 'Must be exactly 10 digits'),
  password: z
    .string()
    .min(8, 'Minimum 8 characters')
    .regex(/[A-Z]/, 'Include 1 uppercase letter')
    .regex(/[0-9]/, 'Include 1 number')
    .regex(/[^a-zA-Z0-9]/, 'Include 1 special character'),
});

// ── Password strength ──────────────────────────────────────────────────────────

function getStrength(pwd = '') {
  let s = 0;
  if (pwd.length >= 8) s++;
  if (/[A-Z]/.test(pwd)) s++;
  if (/[0-9]/.test(pwd)) s++;
  if (/[^a-zA-Z0-9]/.test(pwd)) s++;
  return s;
}

const STRENGTH_META = [
  null,
  { label: 'Weak', barColor: 'bg-red-500', textColor: 'text-red-500', w: '25%' },
  { label: 'Fair', barColor: 'bg-orange-400', textColor: 'text-orange-400', w: '50%' },
  { label: 'Good', barColor: 'bg-yellow-400', textColor: 'text-yellow-500', w: '75%' },
  { label: 'Strong', barColor: 'bg-accent3', textColor: 'text-accent3', w: '100%' },
];

// ── Shared form field ──────────────────────────────────────────────────────────

function Field({ label, error, icon: Icon, showToggle, type = 'text', placeholder, className, ...props }) {
  const [show, setShow] = useState(false);
  const inputType = showToggle ? (show ? 'text' : 'password') : type;

  return (
    <div className={cn('flex flex-col gap-1.5', className)}>
      <label className="font-body text-xs font-semibold text-textSecondary tracking-wide">{label}</label>
      <div className="relative">
        {Icon && (
          <Icon
            size={15}
            strokeWidth={1.8}
            className="absolute left-3.5 top-1/2 -translate-y-1/2 text-textMuted pointer-events-none"
          />
        )}
        <input
          type={inputType}
          placeholder={placeholder}
          className={cn(
            'w-full py-3 rounded-xl bg-surface border font-body text-sm text-textPrimary placeholder:text-textMuted outline-none transition-colors duration-200',
            Icon ? 'pl-10' : 'pl-4',
            showToggle ? 'pr-10' : 'pr-4',
            error
              ? 'border-red-400 focus:border-red-500'
              : 'border-border focus:border-accent'
          )}
          {...props}
        />
        {showToggle && (
          <button
            type="button"
            tabIndex={-1}
            onClick={() => setShow((v) => !v)}
            className="absolute right-3.5 top-1/2 -translate-y-1/2 text-textMuted hover:text-textSecondary transition-colors"
          >
            {show ? <EyeOff size={15} strokeWidth={1.8} /> : <Eye size={15} strokeWidth={1.8} />}
          </button>
        )}
      </div>
      {error && (
        <motion.p
          initial={{ opacity: 0, y: -4 }}
          animate={{ opacity: 1, y: 0 }}
          className="font-body text-xs text-red-500"
        >
          {error}
        </motion.p>
      )}
    </div>
  );
}

// ── Left decorative panel ──────────────────────────────────────────────────────

function LeftPanel() {
  return (
    <div className="hidden md:flex md:w-5/12 lg:w-[42%] relative bg-accent2 flex-col justify-between p-10 overflow-hidden">
      {/* Floating blobs */}
      {[
        { size: 180, style: { left: -50, top: -50 }, dur: 4.5 },
        { size: 130, style: { right: -30, top: '22%' }, dur: 5 },
        { size: 90,  style: { left: '25%', top: '55%' }, dur: 4 },
        { size: 220, style: { right: -60, bottom: -60 }, dur: 6 },
      ].map((b, i) => (
        <motion.div
          key={i}
          style={{ width: b.size, height: b.size, borderRadius: '50%', position: 'absolute', ...b.style }}
          animate={{ y: [0, -14, 0], scale: [1, 1.04, 1] }}
          transition={{ duration: b.dur, repeat: Infinity, delay: i * 0.4, ease: 'easeInOut' }}
          className="bg-white/10"
        />
      ))}

      {/* Logo */}
      <div className="relative z-10">
        <span className="font-display text-3xl font-bold select-none">
          <span className="text-accent">S</span>
          <span className="text-white">OLE</span>
        </span>
      </div>

      {/* Quote */}
      <div className="relative z-10 space-y-5">
        <p className="font-body text-[11px] uppercase tracking-[0.22em] text-white/50">Premium Footwear</p>
        <h2 className="font-display text-4xl xl:text-5xl font-bold text-white leading-[0.95]">
          Every Step<br />Tells A<br />Story.
        </h2>
        <p className="font-body text-sm text-white/65 leading-relaxed max-w-[260px]">
          Premium shoes crafted for those who move with purpose.
          Comfort meets style in every pair.
        </p>
      </div>

      {/* Social proof */}
      <div className="relative z-10 flex items-center gap-3.5">
        <div className="flex -space-x-2">
          {['R', 'P', 'A', 'S', 'M'].map((l, i) => (
            <div
              key={i}
              className="w-8 h-8 rounded-full bg-white/20 border-2 border-accent2 flex items-center justify-center"
            >
              <span className="font-display text-xs text-white font-bold">{l}</span>
            </div>
          ))}
        </div>
        <p className="font-body text-sm text-white/70">
          Join <span className="text-white font-semibold">10,000+</span> shoe lovers
        </p>
      </div>
    </div>
  );
}

// ── Login form ─────────────────────────────────────────────────────────────────

function LoginForm({ onSwitch }) {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const location = useLocation();
  const from = location.state?.from?.pathname || '/';

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm({ resolver: zodResolver(loginSchema) });

  const onSubmit = async (data) => {
    try {
      const res = await api.post('/auth/login', data);
      dispatch(
        setCredentials({
          user: res.data.data.user,
          accessToken: res.data.data.accessToken,
        })
      );
      toast.success('Welcome back!');
      navigate(from, { replace: true });
    } catch (err) {
      toast.error(err.response?.data?.message || 'Login failed. Please try again.');
    }
  };

  return (
    <motion.form
      key="login-form"
      initial={{ opacity: 0, x: 30 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -30 }}
      transition={{ duration: 0.28, ease: 'easeOut' }}
      onSubmit={handleSubmit(onSubmit)}
      className="flex flex-col gap-4"
    >
      <Field
        label="Email address"
        type="email"
        icon={Mail}
        placeholder="you@example.com"
        error={errors.email?.message}
        {...register('email')}
      />

      <div className="flex flex-col gap-1">
        <Field
          label="Password"
          showToggle
          icon={Lock}
          placeholder="••••••••"
          error={errors.password?.message}
          {...register('password')}
        />
        <div className="flex justify-end">
          <Link
            to="/forgot-password"
            className="font-body text-xs text-accent hover:underline"
          >
            Forgot password?
          </Link>
        </div>
      </div>

      <motion.button
        type="submit"
        disabled={isSubmitting}
        whileHover={{ scale: 1.01 }}
        whileTap={{ scale: 0.99 }}
        className="w-full py-3.5 rounded-xl bg-accent text-white font-body font-semibold text-sm hover:bg-orange-600 transition-colors duration-200 disabled:opacity-55 mt-1"
      >
        {isSubmitting ? 'Signing in…' : 'Sign In'}
      </motion.button>

      <p className="text-center font-body text-sm text-textSecondary">
        Don't have an account?{' '}
        <button
          type="button"
          onClick={onSwitch}
          className="text-accent font-semibold hover:underline"
        >
          Register
        </button>
      </p>
    </motion.form>
  );
}

// ── Register form ──────────────────────────────────────────────────────────────

function RegisterForm({ onSwitch }) {
  const navigate = useNavigate();

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors, isSubmitting },
  } = useForm({ resolver: zodResolver(registerSchema), mode: 'onChange' });

  const password = watch('password') || '';
  const strength = getStrength(password);
  const meta = STRENGTH_META[strength];

  const onSubmit = async (data) => {
    try {
      await api.post('/auth/register', data);
      toast.success('Account created! Check your email to verify.');
      navigate('/login');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Registration failed. Try again.');
    }
  };

  return (
    <motion.form
      key="register-form"
      initial={{ opacity: 0, x: 30 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -30 }}
      transition={{ duration: 0.28, ease: 'easeOut' }}
      onSubmit={handleSubmit(onSubmit)}
      className="flex flex-col gap-3.5"
    >
      <Field
        label="Full Name"
        icon={User}
        placeholder="Your full name"
        error={errors.name?.message}
        {...register('name')}
      />
      <Field
        label="Email address"
        type="email"
        icon={Mail}
        placeholder="you@example.com"
        error={errors.email?.message}
        {...register('email')}
      />
      <Field
        label="Phone number"
        type="tel"
        icon={Phone}
        placeholder="10-digit mobile number"
        error={errors.phone?.message}
        {...register('phone')}
      />

      {/* Password with strength bar */}
      <div className="flex flex-col gap-1.5">
        <Field
          label="Password"
          showToggle
          icon={Lock}
          placeholder="••••••••"
          error={errors.password?.message}
          className="gap-1"
          {...register('password')}
        />
        {password.length > 0 && (
          <div className="flex items-center gap-2 mt-0.5">
            <div className="flex-1 h-1.5 bg-surface2 rounded-full overflow-hidden">
              <motion.div
                className={cn('h-full rounded-full', meta?.barColor || '')}
                initial={{ width: 0 }}
                animate={{ width: meta?.w || '0%' }}
                transition={{ duration: 0.35 }}
              />
            </div>
            <span className={cn('font-body text-[10px] font-semibold w-12 text-right', meta?.textColor || '')}>
              {meta?.label}
            </span>
          </div>
        )}
      </div>

      <motion.button
        type="submit"
        disabled={isSubmitting}
        whileHover={{ scale: 1.01 }}
        whileTap={{ scale: 0.99 }}
        className="w-full py-3.5 rounded-xl bg-accent text-white font-body font-semibold text-sm hover:bg-orange-600 transition-colors duration-200 disabled:opacity-55 mt-1"
      >
        {isSubmitting ? 'Creating account…' : 'Create Account'}
      </motion.button>

      <p className="text-center font-body text-sm text-textSecondary">
        Already have an account?{' '}
        <button
          type="button"
          onClick={onSwitch}
          className="text-accent font-semibold hover:underline"
        >
          Sign in
        </button>
      </p>
    </motion.form>
  );
}

// ── Main AuthPage ──────────────────────────────────────────────────────────────

export function AuthPage({ initialTab = 'login' }) {
  const [tab, setTab] = useState(initialTab);

  return (
    <div className="flex min-h-[calc(100vh-4rem)]">
      <LeftPanel />

      <div className="flex-1 flex flex-col items-center justify-center px-6 py-10 bg-background overflow-y-auto">
        <div className="w-full max-w-[400px]">
          {/* Mobile logo */}
          <div className="md:hidden mb-8 text-center">
            <span className="font-display text-3xl font-bold">
              <span className="text-accent">S</span>
              <span className="text-textPrimary">OLE</span>
            </span>
          </div>

          {/* Tab toggle */}
          <div className="flex gap-1 p-1 bg-surface rounded-2xl mb-7">
            {[
              { value: 'login', label: 'Sign In' },
              { value: 'register', label: 'Register' },
            ].map((t) => (
              <button
                key={t.value}
                onClick={() => setTab(t.value)}
                className={cn(
                  'flex-1 py-2.5 rounded-xl font-body font-semibold text-sm transition-all duration-200',
                  tab === t.value
                    ? 'bg-background text-textPrimary shadow-sm'
                    : 'text-textSecondary hover:text-textPrimary'
                )}
              >
                {t.label}
              </button>
            ))}
          </div>

          {/* Heading */}
          <AnimatePresence mode="wait">
            <motion.div
              key={`heading-${tab}`}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.2 }}
              className="mb-6"
            >
              <h1 className="font-display text-2xl text-textPrimary mb-1">
                {tab === 'login' ? 'Welcome back' : 'Create your account'}
              </h1>
              <p className="font-body text-sm text-textSecondary">
                {tab === 'login'
                  ? 'Sign in to continue shopping'
                  : 'Join 10,000+ shoe lovers today'}
              </p>
            </motion.div>
          </AnimatePresence>

          {/* Forms */}
          <AnimatePresence mode="wait">
            {tab === 'login' ? (
              <LoginForm key="login" onSwitch={() => setTab('register')} />
            ) : (
              <RegisterForm key="register" onSwitch={() => setTab('login')} />
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return <AuthPage initialTab="login" />;
}
