import { useEffect } from 'react';
import { Link, NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { motion } from 'framer-motion';
import {
  LayoutDashboard, Package, ShoppingCart, Tag, Users,
  ExternalLink, LogOut, ChevronRight,
} from 'lucide-react';
import { logout, setCredentials } from '../../store/authSlice';
import { cn } from '../../lib/utils';
import api from '../../lib/axios';

const NAV_ITEMS = [
  { icon: LayoutDashboard, label: 'Dashboard', to: '/admin/dashboard' },
  { icon: ShoppingCart, label: 'Orders', to: '/admin/orders' },
  { icon: Package, label: 'Products', to: '/admin/products' },
  { icon: Tag, label: 'Coupons', to: '/admin/coupons' },
  { icon: Users, label: 'Users', to: '/admin/users' },
];

export default function AdminLayout() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { user, accessToken, isAuthenticated } = useSelector((state) => state.auth);

  useEffect(() => {
    if (accessToken && !isAuthenticated) {
      api.get('/auth/me')
        .then((res) => dispatch(setCredentials({ user: res.data.data.user, accessToken })))
        .catch(() => dispatch(logout()));
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleLogout = () => {
    dispatch(logout());
    navigate('/login');
  };

  return (
    <div className="min-h-screen bg-background flex">
      {/* Desktop sidebar */}
      <aside className="hidden md:flex w-60 shrink-0 fixed left-0 top-0 h-screen flex-col bg-textPrimary z-40">
        {/* Logo */}
        <div className="h-16 flex items-center gap-2.5 px-5 border-b border-white/10">
          <Link to="/" className="select-none">
            <span className="font-display text-2xl font-bold">
              <span className="text-accent">S</span>
              <span className="text-surface">OLE</span>
            </span>
          </Link>
          <span className="font-mono text-[9px] uppercase tracking-[0.18em] text-surface/35 border border-white/10 px-1.5 py-0.5 rounded-md">
            Admin
          </span>
        </div>

        {/* User chip */}
        <div className="px-4 py-3 border-b border-white/10">
          <div className="px-3 py-2.5 rounded-xl bg-white/6">
            <p className="font-body text-[9px] uppercase tracking-widest text-surface/35">Signed in as</p>
            <p className="font-display text-sm text-surface font-medium truncate mt-0.5">{user?.name}</p>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-3 py-3 space-y-0.5 overflow-y-auto">
          {NAV_ITEMS.map((item) => (
            <SidebarLink key={item.label} {...item} />
          ))}
        </nav>

        {/* Bottom */}
        <div className="px-3 py-3 border-t border-white/10 space-y-0.5">
          <Link
            to="/"
            className="flex items-center gap-3 px-3 py-2.5 rounded-xl font-body text-sm text-surface/55 hover:text-surface hover:bg-white/10 transition-all duration-200"
          >
            <ExternalLink size={15} strokeWidth={1.8} />
            Back to Store
          </Link>
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl font-body text-sm text-red-400/80 hover:text-red-400 hover:bg-red-500/10 transition-all duration-200"
          >
            <LogOut size={15} strokeWidth={1.8} />
            Sign Out
          </button>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 md:ml-60 min-h-screen pb-16 md:pb-0">
        <Outlet />
      </main>

      {/* Mobile bottom tab bar */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-textPrimary border-t border-white/10 flex items-stretch">
        {NAV_ITEMS.slice(0, 4).map((item) => (
          <MobileTabItem key={item.label} {...item} />
        ))}
      </nav>
    </div>
  );
}

function SidebarLink({ icon: Icon, label, to }) {
  return (
    <NavLink
      to={to}
      className={({ isActive }) =>
        cn(
          'flex items-center gap-3 px-3 py-2.5 rounded-xl font-body text-sm transition-all duration-200',
          isActive
            ? 'bg-accent text-white font-medium shadow-sm'
            : 'text-surface/55 hover:text-surface hover:bg-white/10'
        )
      }
    >
      {({ isActive }) => (
        <>
          <Icon size={15} strokeWidth={isActive ? 2 : 1.8} />
          <span className="flex-1">{label}</span>
          {isActive && (
            <motion.span
              initial={{ opacity: 0, x: -4 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.2 }}
            >
              <ChevronRight size={13} strokeWidth={2.5} />
            </motion.span>
          )}
        </>
      )}
    </NavLink>
  );
}

function MobileTabItem({ icon: Icon, label, to }) {
  return (
    <NavLink
      to={to}
      className={({ isActive }) =>
        cn(
          'flex-1 flex flex-col items-center justify-center gap-1 py-2.5 font-body text-[10px] font-medium transition-colors duration-200',
          isActive ? 'text-accent' : 'text-surface/40'
        )
      }
    >
      {({ isActive }) => (
        <>
          <Icon size={19} strokeWidth={isActive ? 2 : 1.7} />
          <span>{label}</span>
        </>
      )}
    </NavLink>
  );
}
