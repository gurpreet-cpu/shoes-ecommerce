import { useState, useEffect, useRef } from 'react';
import { Link, NavLink, useNavigate } from 'react-router-dom';
import { useSelector, useDispatch } from 'react-redux';
import { motion, AnimatePresence } from 'framer-motion';
import { ShoppingBag, Search, User, Menu, X, ChevronDown, LogOut, Package } from 'lucide-react';
import { logout } from '../../store/authSlice';
import { toggleCart } from '../../store/cartSlice';
import { cn } from '../../lib/utils';

const NAV_LINKS = [
  { label: 'Home', to: '/' },
  { label: 'Men', to: '/shop?category=mens' },
  { label: 'Women', to: '/shop?category=womens' },
  { label: 'Sale', to: '/shop?sale=true' },
];

export default function Navbar({ onSearchOpen }) {
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [cartBounce, setCartBounce] = useState(false);
  const prevCountRef = useRef(0);
  const userMenuRef = useRef(null);
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { isAuthenticated, user } = useSelector((state) => state.auth);
  const { items } = useSelector((state) => state.cart);
  const cartCount = items.reduce((sum, item) => sum + (item.quantity || 0), 0);

  useEffect(() => {
    const handler = () => setScrolled(window.scrollY > 50);
    window.addEventListener('scroll', handler, { passive: true });
    return () => window.removeEventListener('scroll', handler);
  }, []);

  useEffect(() => {
    if (cartCount > prevCountRef.current) {
      setCartBounce(true);
      const t = setTimeout(() => setCartBounce(false), 500);
      return () => clearTimeout(t);
    }
    prevCountRef.current = cartCount;
  }, [cartCount]);

  useEffect(() => {
    const handler = (e) => {
      if (userMenuRef.current && !userMenuRef.current.contains(e.target)) {
        setUserMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  useEffect(() => {
    document.body.style.overflow = mobileOpen ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [mobileOpen]);

  const handleLogout = () => {
    dispatch(logout());
    setUserMenuOpen(false);
    navigate('/');
  };

  return (
    <>
      <header
        className={cn(
          'fixed top-0 left-0 right-0 z-50 transition-all duration-300',
          scrolled
            ? 'bg-background shadow-sm border-b border-border'
            : 'bg-background/80 backdrop-blur-md border-b border-border/50'
        )}
      >
        <div className="max-w-7xl mx-auto px-5 h-16 flex items-center justify-between">
          {/* Logo */}
          <Link to="/" className="shrink-0">
            <span className="font-display text-2xl font-bold tracking-tight select-none">
              <span className="text-accent">S</span>
              <span className="text-textPrimary">OLE</span>
            </span>
          </Link>

          {/* Desktop Nav */}
          <nav className="hidden md:flex items-center gap-7">
            {NAV_LINKS.map((link) => (
              <DesktopNavLink key={link.label} {...link} />
            ))}
            {isAuthenticated && user?.role === 'admin' && (
              <Link
                to="/admin/dashboard"
                className="font-body text-sm font-medium text-accent2 hover:text-violet-800 transition-colors duration-200"
              >
                Admin
              </Link>
            )}
          </nav>

          {/* Actions */}
          <div className="flex items-center gap-0.5">
            <IconBtn onClick={onSearchOpen} label="Search">
              <Search size={19} strokeWidth={1.8} />
            </IconBtn>

            <div className="relative">
              <IconBtn onClick={() => dispatch(toggleCart())} label="Cart">
                <ShoppingBag size={19} strokeWidth={1.8} />
              </IconBtn>
              <AnimatePresence>
                {cartCount > 0 && (
                  <motion.span
                    key={cartCount}
                    initial={{ scale: 0 }}
                    animate={cartBounce ? { scale: [1, 1.4, 1] } : { scale: 1 }}
                    exit={{ scale: 0 }}
                    transition={{ type: 'spring', stiffness: 500, damping: 20 }}
                    className="absolute -top-0.5 -right-0.5 w-[18px] h-[18px] bg-accent text-white text-[9px] font-mono font-bold rounded-full flex items-center justify-center pointer-events-none"
                  >
                    {cartCount > 9 ? '9+' : cartCount}
                  </motion.span>
                )}
              </AnimatePresence>
            </div>

            {isAuthenticated ? (
              <div className="relative" ref={userMenuRef}>
                <button
                  onClick={() => setUserMenuOpen((v) => !v)}
                  className="flex items-center gap-1 p-2.5 rounded-xl text-textSecondary hover:text-textPrimary hover:bg-surface transition-all duration-200"
                >
                  <User size={19} strokeWidth={1.8} />
                  <ChevronDown
                    size={11}
                    strokeWidth={2.5}
                    className={cn('transition-transform duration-200', userMenuOpen && 'rotate-180')}
                  />
                </button>
                <AnimatePresence>
                  {userMenuOpen && (
                    <motion.div
                      initial={{ opacity: 0, y: -6, scale: 0.96 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: -6, scale: 0.96 }}
                      transition={{ duration: 0.15, ease: 'easeOut' }}
                      className="absolute right-0 top-full mt-2 w-48 bg-background border border-border rounded-2xl shadow-xl overflow-hidden py-1.5 z-50"
                    >
                      <div className="px-4 py-2.5 border-b border-border">
                        <p className="font-body text-[10px] text-textMuted uppercase tracking-wider">Signed in as</p>
                        <p className="font-display text-sm text-textPrimary truncate mt-0.5">{user?.name}</p>
                      </div>
                      <MenuLink icon={User} label="Profile" to="/profile" onClose={() => setUserMenuOpen(false)} />
                      <MenuLink icon={Package} label="My Orders" to="/orders" onClose={() => setUserMenuOpen(false)} />
                      <div className="my-1 border-t border-border" />
                      <button
                        onClick={handleLogout}
                        className="w-full flex items-center gap-3 px-4 py-2.5 font-body text-sm text-red-500 hover:bg-surface transition-colors duration-150"
                      >
                        <LogOut size={14} strokeWidth={1.8} />
                        Sign out
                      </button>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            ) : (
              <IconBtn onClick={() => navigate('/login')} label="Sign in">
                <User size={19} strokeWidth={1.8} />
              </IconBtn>
            )}

            <button
              onClick={() => setMobileOpen(true)}
              className="md:hidden p-2.5 rounded-xl text-textSecondary hover:text-textPrimary hover:bg-surface transition-all duration-200"
              aria-label="Open menu"
            >
              <Menu size={19} strokeWidth={1.8} />
            </button>
          </div>
        </div>
      </header>

      <AnimatePresence>
        {mobileOpen && (
          <MobileMenu
            links={NAV_LINKS}
            isAdmin={user?.role === 'admin'}
            isAuthenticated={isAuthenticated}
            user={user}
            onClose={() => setMobileOpen(false)}
            onLogout={handleLogout}
          />
        )}
      </AnimatePresence>
    </>
  );
}

function IconBtn({ onClick, label, children }) {
  return (
    <motion.button
      whileHover={{ scale: 1.06 }}
      whileTap={{ scale: 0.94 }}
      onClick={onClick}
      aria-label={label}
      className="p-2.5 rounded-xl text-textSecondary hover:text-textPrimary hover:bg-surface transition-all duration-200"
    >
      {children}
    </motion.button>
  );
}

function DesktopNavLink({ label, to }) {
  return (
    <NavLink
      to={to}
      className={({ isActive }) =>
        cn(
          'relative font-body text-sm font-medium tracking-wide py-1 transition-colors duration-200',
          isActive ? 'text-accent' : 'text-textSecondary hover:text-textPrimary'
        )
      }
    >
      {({ isActive }) => (
        <>
          {label}
          {isActive && (
            <motion.span
              layoutId="nav-underline"
              className="absolute -bottom-0.5 left-0 right-0 h-0.5 bg-accent rounded-full"
              transition={{ type: 'spring', stiffness: 500, damping: 40 }}
            />
          )}
        </>
      )}
    </NavLink>
  );
}

function MenuLink({ icon: Icon, label, to, onClose }) {
  return (
    <Link
      to={to}
      onClick={onClose}
      className="flex items-center gap-3 px-4 py-2.5 font-body text-sm text-textPrimary hover:bg-surface transition-colors duration-150"
    >
      <Icon size={14} strokeWidth={1.8} className="text-textSecondary" />
      {label}
    </Link>
  );
}

function MobileMenu({ links, isAdmin, isAuthenticated, user, onClose, onLogout }) {
  const containerVariants = {
    hidden: {},
    visible: { transition: { staggerChildren: 0.055, delayChildren: 0.05 } },
    exit: { transition: { staggerChildren: 0.03, staggerDirection: -1 } },
  };

  const linkVariants = {
    hidden: { opacity: 0, y: 28 },
    visible: { opacity: 1, y: 0, transition: { type: 'spring', stiffness: 300, damping: 28 } },
    exit: { opacity: 0, y: -16, transition: { duration: 0.18 } },
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.18 }}
      className="fixed inset-0 z-[100] bg-textPrimary/96 backdrop-blur-sm flex flex-col"
    >
      <div className="flex items-center justify-between px-5 h-16 border-b border-white/10">
        <span className="font-display text-2xl font-bold select-none">
          <span className="text-accent">S</span>
          <span className="text-surface">OLE</span>
        </span>
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={onClose}
          className="p-2.5 rounded-xl text-surface/50 hover:text-surface hover:bg-white/10 transition-all duration-200"
        >
          <X size={21} strokeWidth={1.8} />
        </motion.button>
      </div>

      <motion.nav
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        exit="exit"
        className="flex-1 flex flex-col items-center justify-center gap-1 px-8"
      >
        {links.map((link) => (
          <motion.div key={link.label} variants={linkVariants} className="w-full text-center">
            <Link
              to={link.to}
              onClick={onClose}
              className="block py-2.5 font-display text-[11vw] leading-tight font-bold text-surface/75 hover:text-accent transition-colors duration-200"
            >
              {link.label}
            </Link>
          </motion.div>
        ))}
        {isAdmin && (
          <motion.div variants={linkVariants} className="w-full text-center">
            <Link
              to="/admin/dashboard"
              onClick={onClose}
              className="block py-2.5 font-display text-[11vw] leading-tight font-bold text-accent2/75 hover:text-accent2 transition-colors duration-200"
            >
              Admin
            </Link>
          </motion.div>
        )}
      </motion.nav>

      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.35, duration: 0.3 }}
        className="px-5 pb-8 pt-5 border-t border-white/10"
      >
        {isAuthenticated ? (
          <div className="flex items-center justify-between">
            <div>
              <p className="font-body text-[10px] text-surface/40 uppercase tracking-widest">Signed in as</p>
              <p className="font-display text-surface font-semibold mt-0.5">{user?.name}</p>
            </div>
            <button
              onClick={onLogout}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white/10 text-surface/70 hover:text-surface hover:bg-white/20 font-body text-sm transition-all duration-200"
            >
              <LogOut size={14} strokeWidth={1.8} />
              Sign out
            </button>
          </div>
        ) : (
          <div className="flex gap-3">
            <Link
              to="/login"
              onClick={onClose}
              className="flex-1 text-center py-3.5 rounded-xl border border-white/20 text-surface font-body font-medium hover:bg-white/10 transition-all duration-200"
            >
              Sign In
            </Link>
            <Link
              to="/register"
              onClick={onClose}
              className="flex-1 text-center py-3.5 rounded-xl bg-accent text-white font-body font-semibold hover:bg-orange-600 transition-all duration-200"
            >
              Register
            </Link>
          </div>
        )}
      </motion.div>
    </motion.div>
  );
}
