import { useState, useEffect } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useDispatch, useSelector } from 'react-redux';
import Navbar from './Navbar';
import Footer from './Footer';
import SearchModal from '../search/SearchModal';
import CartDrawer from '../cart/CartDrawer';
import { setCredentials, logout } from '../../store/authSlice';
import api from '../../lib/axios';

export default function Layout() {
  const location = useLocation();
  const [searchOpen, setSearchOpen] = useState(false);
  const dispatch = useDispatch();
  const { accessToken, isAuthenticated } = useSelector((s) => s.auth);

  // Restore auth session from localStorage token on first load
  useEffect(() => {
    if (accessToken && !isAuthenticated) {
      api.get('/auth/me')
        .then((res) => {
          dispatch(setCredentials({ user: res.data.data.user, accessToken }));
        })
        .catch(() => {
          dispatch(logout());
        });
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <>
      <Navbar onSearchOpen={() => setSearchOpen(true)} />
      <CartDrawer />
      <SearchModal open={searchOpen} onClose={() => setSearchOpen(false)} />

      <AnimatePresence mode="wait" initial={false}>
        <motion.main
          key={location.pathname}
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.28, ease: 'easeInOut' }}
          className="min-h-screen pt-16"
        >
          <Outlet />
        </motion.main>
      </AnimatePresence>

      <Footer />
    </>
  );
}
