import { useEffect, useState, useRef } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Home, Search, ArrowLeft, Ghost, Sparkles, Zap, AlertTriangle } from 'lucide-react';
import { SEO } from '@/components/SEO';
import { cn } from '@/lib/utils';

function Particles() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationId: number;
    let particles: Array<{
      x: number;
      y: number;
      vx: number;
      vy: number;
      size: number;
      alpha: number;
    }> = [];

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };

    const createParticle = () => ({
      x: Math.random() * canvas.width,
      y: Math.random() * canvas.height,
      vx: (Math.random() - 0.5) * 0.5,
      vy: (Math.random() - 0.5) * 0.5,
      size: Math.random() * 3 + 1,
      alpha: Math.random() * 0.4 + 0.1,
    });

    const init = () => {
      particles = Array.from({ length: 50 }, createParticle);
    };

    const animate = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      particles.forEach((particle) => {
        particle.x += particle.vx;
        particle.y += particle.vy;

        if (particle.x < 0 || particle.x > canvas.width) particle.vx *= -1;
        if (particle.y < 0 || particle.y > canvas.height) particle.vy *= -1;

        ctx.beginPath();
        ctx.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(17, 34, 80, ${particle.alpha})`;
        ctx.fill();
      });

      particles.forEach((p1, i) => {
        particles.slice(i + 1).forEach((p2) => {
          const dx = p1.x - p2.x;
          const dy = p1.y - p2.y;
          const dist = Math.sqrt(dx * dx + dy * dy);

          if (dist < 150) {
            ctx.beginPath();
            ctx.moveTo(p1.x, p1.y);
            ctx.lineTo(p2.x, p2.y);
            ctx.strokeStyle = `rgba(17, 34, 80, ${0.08 * (1 - dist / 150)})`;
            ctx.stroke();
          }
        });
      });

      animationId = requestAnimationFrame(animate);
    };

    resize();
    init();
    animate();

    window.addEventListener('resize', resize);

    return () => {
      cancelAnimationFrame(animationId);
      window.removeEventListener('resize', resize);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 pointer-events-none"
      style={{ zIndex: 0 }}
    />
  );
}

function FloatingElement({ 
  children, 
  delay = 0,
  className 
}: { 
  children: React.ReactNode; 
  delay?: number;
  className?: string;
}) {
  return (
    <div
      className={cn("animate-float", className)}
      style={{ animationDelay: `${delay}s` }}
    >
      {children}
    </div>
  );
}

export function NotFound() {
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (containerRef.current) {
        const rect = containerRef.current.getBoundingClientRect();
        setMousePosition({
          x: (e.clientX - rect.left - rect.width / 2) / 20,
          y: (e.clientY - rect.top - rect.height / 2) / 20,
        });
      }
    };

    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, []);

  return (
    <>
      <SEO
        title="404 - Halaman Tidak Ditemukan"
        description="Maaf, halaman yang Anda cari tidak ditemukan. Silakan kembali ke beranda atau hubungi support kami."
        noIndex
      />
      <div
        ref={containerRef}
        className="min-h-screen flex items-center justify-center px-4 relative overflow-hidden bg-background text-foreground"
      >
        <Particles />

        <div className="relative z-10 max-w-2xl w-full text-center">
          {/* 404 Display */}
          <FloatingElement delay={0}>
            <div className="relative mb-6">
              <h1 className="text-[140px] sm:text-[180px] font-black leading-none tracking-tighter text-primary">
                404
              </h1>
            </div>
          </FloatingElement>

          {/* Ghost Icon */}
          <FloatingElement delay={0.2} className="mb-6">
            <div className="relative inline-block">
              <div
                className="w-20 h-20 rounded-2xl flex items-center justify-center mx-auto bg-card border border-border shadow-soft"
                style={{
                  transform: `translate(${mousePosition.x * 2}px, ${mousePosition.y * 2}px)`,
                  transition: 'transform 0.2s ease-out',
                }}
              >
                <Ghost className="h-10 w-10 text-primary" />
              </div>
              <Sparkles className="absolute -top-2 -right-2 h-5 w-5 text-accent animate-pulse" />
              <Zap className="absolute -bottom-1 -left-2 h-4 w-4 text-primary animate-pulse" />
            </div>
          </FloatingElement>

          {/* Text Content */}
          <FloatingElement delay={0.4} className="mb-8">
            <h2 className="text-2xl sm:text-3xl font-bold mb-3 text-primary">
              Halaman Tidak Ditemukan
            </h2>
            <p className="text-base max-w-md mx-auto leading-relaxed text-secondary">
              Sepertinya halaman yang Anda cari tidak tersedia atau telah dipindahkan.
            </p>
          </FloatingElement>

          {/* Action Buttons */}
          <FloatingElement delay={0.6} className="mb-8">
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
          </FloatingElement>

          {/* Suggested Links */}
          <FloatingElement delay={0.8}>
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
          </FloatingElement>

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
