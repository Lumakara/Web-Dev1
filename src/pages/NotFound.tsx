import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Home, Search, ArrowLeft, Ghost, AlertTriangle } from 'lucide-react';
import { SEO } from '@/components/SEO';
import { cn } from '@/lib/utils';

/**
 * Entrance stagger — one-shot fade-up that establishes reading order, then
 * settles. Replaces the previous perpetual `animate-float` (decorative motion
 * with no informational value) and the 50-particle canvas.
 */
function Reveal({
  children,
  delay = 0,
  className,
}: {
  children: React.ReactNode;
  delay?: number;
  className?: string;
}) {
  return (
    <div
      className={cn('motion-safe:animate-in motion-safe:fade-in motion-safe:slide-in-from-bottom-2 motion-safe:duration-500 motion-safe:fill-mode-both', className)}
      style={{ animationDelay: `${delay}s` }}
    >
      {children}
    </div>
  );
}

export function NotFound() {
  return (
    <>
      <SEO
        title="404 - Halaman Tidak Ditemukan"
        description="Maaf, halaman yang Anda cari tidak ditemukan. Silakan kembali ke beranda atau hubungi support kami."
        noIndex
      />
      <div className="min-h-screen flex items-center justify-center px-4 relative overflow-hidden bg-background text-foreground">
        <div className="relative z-10 max-w-2xl w-full text-center">
          {/* 404 Display */}
          <Reveal delay={0}>
            <div className="relative mb-6">
              <h1 className="text-[140px] sm:text-[180px] font-black leading-none tracking-tighter text-primary">
                404
              </h1>
            </div>
          </Reveal>

          {/* Ghost Icon */}
          <Reveal delay={0.2} className="mb-6">
            <div className="w-20 h-20 rounded-2xl flex items-center justify-center mx-auto bg-card border border-border shadow-soft">
              <Ghost className="h-10 w-10 text-primary" />
            </div>
          </Reveal>

          {/* Text Content */}
          <Reveal delay={0.4} className="mb-8">
            <h2 className="text-2xl sm:text-3xl font-bold mb-3 text-primary">
              Halaman Tidak Ditemukan
            </h2>
            <p className="text-base max-w-md mx-auto leading-relaxed text-secondary">
              Sepertinya halaman yang Anda cari tidak tersedia atau telah dipindahkan.
            </p>
          </Reveal>

          {/* Action Buttons */}
          <Reveal delay={0.6} className="mb-8">
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Link to="/">
                <Button
                  size="lg"
                  className="bg-primary hover:bg-secondary text-primary-foreground font-semibold px-8 py-6 text-base shadow-sm transition-colors w-full sm:w-auto"
                >
                  <Home className="h-5 w-5 mr-2" />
                  Kembali ke Beranda
                </Button>
              </Link>
              <Button
                variant="outline"
                size="lg"
                onClick={() => window.history.back()}
                className="border-border text-primary hover:bg-muted font-semibold px-8 py-6 text-base w-full sm:w-auto"
              >
                <ArrowLeft className="h-5 w-5 mr-2" />
                Halaman Sebelumnya
              </Button>
            </div>
          </Reveal>

          {/* Suggested Links */}
          <Reveal delay={0.8}>
            <div className="p-6 rounded-2xl border border-border bg-card shadow-sm">
              <div className="flex items-center justify-center gap-2 mb-4">
                <Search className="h-4 w-4 text-primary" />
                <span className="font-semibold text-sm text-primary">
                  Mungkin Anda mencari:
                </span>
              </div>
              <div className="flex flex-wrap justify-center gap-2">
                {[
                  { label: 'Produk', path: '/' },
                  { label: 'Keranjang', path: '/cart' },
                  { label: 'Akun Saya', path: '/profile' },
                  { label: 'Bantuan', path: '/support' },
                ].map((link) => (
                  <Link
                    key={link.path}
                    to={link.path}
                    className="px-4 py-2 rounded-full text-xs font-semibold bg-background border border-border text-secondary hover:bg-muted transition-colors"
                  >
                    {link.label}
                  </Link>
                ))}
              </div>
            </div>
          </Reveal>

          {/* Help Section */}
          <div className="mt-8 pt-6 border-t border-border">
            <div className="flex items-center justify-center gap-2 mb-3">
              <AlertTriangle className="h-4 w-4 text-accent" />
              <span className="text-xs text-muted-foreground">
                Butuh bantuan lebih lanjut?
              </span>
            </div>
            <div className="flex justify-center gap-4 text-xs font-semibold">
              <a href="mailto:support@lumakara.com" className="text-primary hover:underline">
                Email Support
              </a>
              <span className="text-border">|</span>
              <a href="https://wa.me/6288992222666" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
                WhatsApp
              </a>
              <span className="text-border">|</span>
              <Link to="/support" className="text-primary hover:underline">
                Pusat Bantuan
              </Link>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

export default NotFound;
