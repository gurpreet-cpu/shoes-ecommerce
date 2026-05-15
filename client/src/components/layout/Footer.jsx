import { useRef } from 'react';
import { Link } from 'react-router-dom';
import { motion, useInView } from 'framer-motion';
import { MessageCircle, Mail, Phone, MapPin } from 'lucide-react';

const IconInstagram = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <rect x="2" y="2" width="20" height="20" rx="5" ry="5"/><path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"/><line x1="17.5" y1="6.5" x2="17.51" y2="6.5"/>
  </svg>
);
const IconX = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor">
    <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.402 6.231H2.746l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
  </svg>
);
const IconFacebook = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor">
    <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
  </svg>
);

function FadeInSection({ children, delay = 0 }) {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: '-60px' });

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 22 }}
      animate={isInView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.5, delay, ease: 'easeOut' }}
    >
      {children}
    </motion.div>
  );
}

const SHOP_LINKS = [
  { label: "Men's", to: '/shop?category=mens' },
  { label: "Women's", to: '/shop?category=womens' },
  { label: 'New Arrivals', to: '/shop?sort=newest' },
  { label: 'Sale', to: '/shop?sale=true' },
  { label: 'All Products', to: '/shop' },
];

const HELP_LINKS = ['FAQ', 'Shipping Info', 'Returns', 'Size Guide', 'Contact Us'];

export default function Footer() {
  return (
    <footer className="bg-textPrimary mt-20">
      <div className="max-w-7xl mx-auto px-5 pt-16 pb-10">
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-12 md:gap-8">
          {/* Brand */}
          <FadeInSection delay={0}>
            <Link to="/" className="inline-block mb-4">
              <span className="font-display text-3xl font-bold select-none">
                <span className="text-accent">S</span>
                <span className="text-surface">OLE</span>
              </span>
            </Link>
            <p className="font-body text-surface/50 text-sm leading-relaxed mb-6 max-w-[200px]">
              Premium footwear crafted for those who walk with intention.
            </p>
            <div className="flex items-center gap-2.5">
              <SocialIcon icon={IconInstagram} href="#" label="Instagram" hoverClass="hover:text-pink-400 hover:bg-pink-400/10" />
              <SocialIcon icon={IconX} href="#" label="X / Twitter" hoverClass="hover:text-surface hover:bg-white/20" />
              <SocialIcon icon={IconFacebook} href="#" label="Facebook" hoverClass="hover:text-blue-400 hover:bg-blue-400/10" />
            </div>
          </FadeInSection>

          {/* Shop */}
          <FadeInSection delay={0.08}>
            <h4 className="font-display text-[11px] font-semibold uppercase tracking-[0.15em] text-surface/35 mb-5">
              Shop
            </h4>
            <ul className="space-y-3">
              {SHOP_LINKS.map((link) => (
                <li key={link.label}>
                  <Link
                    to={link.to}
                    className="font-body text-sm text-surface/55 hover:text-accent transition-colors duration-200"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </FadeInSection>

          {/* Help */}
          <FadeInSection delay={0.16}>
            <h4 className="font-display text-[11px] font-semibold uppercase tracking-[0.15em] text-surface/35 mb-5">
              Help
            </h4>
            <ul className="space-y-3">
              {HELP_LINKS.map((item) => (
                <li key={item}>
                  <button className="font-body text-sm text-surface/55 hover:text-accent transition-colors duration-200 text-left">
                    {item}
                  </button>
                </li>
              ))}
            </ul>
          </FadeInSection>

          {/* Contact */}
          <FadeInSection delay={0.24}>
            <h4 className="font-display text-[11px] font-semibold uppercase tracking-[0.15em] text-surface/35 mb-5">
              Contact
            </h4>
            <ul className="space-y-3.5">
              <li>
                <a
                  href="mailto:hello@sole.in"
                  className="flex items-start gap-3 font-body text-sm text-surface/55 hover:text-accent transition-colors duration-200 group"
                >
                  <Mail size={14} className="text-accent mt-0.5 shrink-0" strokeWidth={1.8} />
                  hello@sole.in
                </a>
              </li>
              <li>
                <a
                  href="tel:+918000000000"
                  className="flex items-start gap-3 font-body text-sm text-surface/55 hover:text-accent transition-colors duration-200"
                >
                  <Phone size={14} className="text-accent mt-0.5 shrink-0" strokeWidth={1.8} />
                  +91 80000 00000
                </a>
              </li>
              <li className="flex items-start gap-3">
                <MapPin size={14} className="text-accent mt-0.5 shrink-0" strokeWidth={1.8} />
                <span className="font-body text-sm text-surface/55">
                  Connaught Place, New Delhi 110001
                </span>
              </li>
            </ul>
            <motion.a
              href="https://wa.me/918000000000"
              target="_blank"
              rel="noopener noreferrer"
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.97 }}
              className="mt-5 inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#25D366] text-white font-body text-sm font-semibold hover:bg-[#1ebe5c] transition-colors duration-200"
            >
              <MessageCircle size={15} strokeWidth={1.8} />
              WhatsApp Us
            </motion.a>
          </FadeInSection>
        </div>
      </div>

      {/* Bottom bar */}
      <div className="border-t border-white/8">
        <div className="max-w-7xl mx-auto px-5 py-5 flex flex-col sm:flex-row items-center justify-between gap-3">
          <p className="font-body text-xs text-surface/30">
            © {new Date().getFullYear()} SOLE. All rights reserved.
          </p>
          <div className="flex items-center gap-2">
            <PaymentBadge label="Paytm" />
            <PaymentBadge label="UPI" />
            <PaymentBadge label="COD" variant="green" />
          </div>
        </div>
      </div>
    </footer>
  );
}

function SocialIcon({ icon: Icon, href, label, hoverClass }) {
  return (
    <motion.a
      href={href}
      aria-label={label}
      whileHover={{ scale: 1.12, y: -2 }}
      whileTap={{ scale: 0.93 }}
      className={`p-2.5 rounded-xl bg-white/8 text-surface/50 transition-all duration-200 ${hoverClass}`}
    >
      <Icon />
    </motion.a>
  );
}

function PaymentBadge({ label, variant }) {
  return (
    <span
      className={`px-2.5 py-1 rounded-lg font-mono text-[10px] font-medium border ${
        variant === 'green'
          ? 'border-[#25D366]/25 text-[#25D366]/60 bg-[#25D366]/8'
          : 'border-white/10 text-surface/35 bg-white/5'
      }`}
    >
      {label}
    </span>
  );
}
