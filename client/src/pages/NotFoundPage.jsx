import { Link } from 'react-router-dom';

export default function NotFoundPage() {
  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center gap-6 px-4">
      <p className="font-mono text-sm text-textSecondary tracking-widest uppercase">404</p>
      <h1 className="font-display text-5xl md:text-7xl text-textPrimary text-center leading-tight">
        Page Not Found
      </h1>
      <p className="font-body text-textSecondary text-center max-w-sm">
        The page you&apos;re looking for doesn&apos;t exist or has been moved.
      </p>
      <Link
        to="/"
        className="mt-2 inline-flex items-center gap-2 bg-accent text-white font-body font-medium px-6 py-3 rounded-sm hover:bg-orange-600 transition-all duration-200"
      >
        Back to Home
      </Link>
    </div>
  );
}
