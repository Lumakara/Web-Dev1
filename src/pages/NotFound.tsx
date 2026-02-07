import { useEffect, useState, useRef } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Home, Search, ArrowLeft, Ghost, Sparkles, Zap, AlertTriangle } from 'lucide-react';
import { SEO } from '@/components/SEO';
import { useAppStore } from '@/store/appStore';
import { cn } from '@/lib/utils';

// Animated particles component
function Particles({ isDarkMode }: { isDarkMode: boolean }) {
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
      alpha: Math.random() * 0.5 + 0.2,
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
        ctx.fillStyle = isDarkMode
          ? `rgba(147, 197, 253, ${particle.alpha})`
          : `rgba(59, 130, 246, ${particle.alpha})`;
        ctx.fill();
      });

      // Draw connections
      particles.forEach((p1, i) => {
        particles.slice(i + 1).forEach((p2) => {
          const dx = p1.x - p2.x;
          const dy = p1.y - p2.y;
          const dist = Math.sqrt(dx * dx + dy * dy);

          if (dist < 150) {
            ctx.beginPath();
            ctx.moveTo(p1.x, p1.y);
            ctx.lineTo(p2.x, p2.y);
            ctx.strokeStyle = isDarkMode
              ? `rgba(147, 197, 253, ${0.1 * (1 - dist / 150)})`
              : `rgba(59, 130, 246, ${0.1 * (1 - dist / 150)})`;
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
  }, [isDarkMode]);

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 pointer-events-none"
      style={{ zIndex: 0 }}
    />
  );
}

// Glitch text effect
function GlitchText({ text, className }: { text: string; className?: string }) {
  return (
    <div className={cn("relative inline-block", className)}>
      <span className="relative z-10">{text}</span>
      <span
        className="absolute top-0 left-0 -z-10 text-red-500 animate-pulse"
        style={{ clipPath: 'inset(0 0 50% 0)', transform: 'translateX(2px)' }}
      >
        {text}
      </span>
      <span
        className="absolute top-0 left-0 -z-10 text-blue-500 animate-pulse"
        style={{ clipPath: 'inset(50% 0 0 0)', transform: 'translateX(-2px)', animationDelay: '0.1s' }}
      >
        {text}
      </span>
    </div>
  );
}

// Floating animation wrapper
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
  const { isDarkMode } = useAppStore();
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
        className={cn(
          "min-h-screen flex items-center justify-center px-4 relative overflow-hidden",
          isDarkMode
            ? "bg-gradient-to-br from-gray-900 via-slate-900 to-gray-900"
            : "bg-gradient-to-br from-blue-50 via-white to-orange-50"
        )}
      >
        {/* Animated Particles Background */}
        <Particles isDarkMode={isDarkMode} />

        {/* Animated Gradient Orbs */}
        <div
          className="absolute top-20 left-20 w-72 h-72 rounded-full blur-3xl opacity-30 animate-pulse"
          style={{
            background: 'linear-gradient(135deg, #3B82F6 0%, #8B5CF6 100%)',
            transform: `translate(${mousePosition.x * -1}px, ${mousePosition.y * -1}px)`,
            transition: 'transform 0.3s ease-out',
          }}
        />
        <div
          className="absolute bottom-20 right-20 w-96 h-96 rounded-full blur-3xl opacity-30 animate-pulse"
          style={{
            background: 'linear-gradient(135deg, #F97316 0%, #EF4444 100%)',
            animationDelay: '1s',
            transform: `translate(${mousePosition.x}px, ${mousePosition.y}px)`,
            transition: 'transform 0.3s ease-out',
          }}
        />

        {/* Main Content */}
        <div className="relative z-10 max-w-2xl w-full text-center">
          {/* 404 Number with Glitch Effect */}
          <FloatingElement delay={0}>
            <div className="relative mb-8">
              <GlitchText
                text="404"
                className={cn(
                  "text-[150px] md:text-[200px] font-black leading-none tracking-tighter",
                  isDarkMode
                    ? "text-transparent bg-clip-text bg-gradient-to-r from-blue-400 via-purple-400 to-orange-400"
                    : "text-transparent bg-clip-text bg-gradient-to-r from-blue-600 via-purple-600 to-orange-500"
                )}
              />
              
              {/* Shadow glow */}
              <div
                className="absolute -bottom-4 left-1/2 -translate-x-1/2 w-48 h-8 rounded-full blur-2xl opacity-50"
                style={{
                  background: 'linear-gradient(90deg, #3B82F6, #F97316)',
                }}
              />
            </div>
          </FloatingElement>

          {/* Ghost Icon */}
          <FloatingElement delay={0.2} className="mb-6">
            <div className="relative inline-block">
              <div
                className={cn(
                  "w-24 h-24 rounded-full flex items-center justify-center mx-auto",
                  "shadow-2xl animate-bounce",
                  isDarkMode ? "bg-gray-800" : "bg-white"
                )}
                style={{
                  transform: `translate(${mousePosition.x * 2}px, ${mousePosition.y * 2}px)`,
                  transition: 'transform 0.2s ease-out',
                }}
              >
                <Ghost
                  className={cn(
                    "h-12 w-12",
                    isDarkMode ? "text-purple-400" : "text-purple-500"
                  )}
                />
              </div>
              
              {/* Floating sparkles */}
              <Sparkles
                className="absolute -top-2 -right-2 h-6 w-6 text-yellow-400 animate-pulse"
              />
              <Zap
                className="absolute -bottom-1 -left-3 h-5 w-5 text-orange-400 animate-pulse"
                style={{ animationDelay: '0.3s' }}
              />
            </div>
          </FloatingElement>

          {/* Text Content */}
          <FloatingElement delay={0.4} className="mb-8">
            <h1
              className={cn(
                "text-3xl md:text-4xl font-bold mb-4",
                isDarkMode ? "text-white" : "text-gray-900"
              )}
            >
              Oops! Halaman Hilang
            </h1>
            <p
              className={cn(
                "text-lg max-w-md mx-auto leading-relaxed",
                isDarkMode ? "text-gray-400" : "text-gray-600"
              )}
            >
              Sepertinya halaman yang Anda cari telah menghilang ke dimensi lain. 
              Jangan khawatir, kami bisa membantu Anda kembali!
            </p>
          </FloatingElement>

          {/* Action Buttons */}
          <FloatingElement delay={0.6} className="mb-8">
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link to="/">
                <Button
                  size="lg"
                  className={cn(
                    "bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700",
                    "text-white shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105",
                    "px-8 py-6 text-base font-semibold"
                  )}
                >
                  <Home className="h-5 w-5 mr-2" />
                  Kembali ke Beranda
                </Button>
              </Link>
              <Button
                variant="outline"
                size="lg"
                onClick={() => window.history.back()}
                className={cn(
                  "px-8 py-6 text-base font-semibold transition-all duration-300 hover:scale-105",
                  isDarkMode
                    ? "border-gray-700 text-gray-300 hover:bg-gray-800 hover:text-white"
                    : "border-gray-300 text-gray-700 hover:bg-gray-50"
                )}
              >
                <ArrowLeft className="h-5 w-5 mr-2" />
                Halaman Sebelumnya
              </Button>
            </div>
          </FloatingElement>

          {/* Suggested Links */}
          <FloatingElement delay={0.8}>
            <div
              className={cn(
                "p-6 rounded-2xl border",
                isDarkMode
                  ? "bg-gray-800/50 border-gray-700 backdrop-blur-sm"
                  : "bg-white/50 border-gray-200 backdrop-blur-sm"
              )}
            >
              <div className="flex items-center justify-center gap-2 mb-4">
                <Search className={cn("h-5 w-5", isDarkMode ? "text-gray-400" : "text-gray-500")} />
                <span className={cn("font-medium", isDarkMode ? "text-gray-300" : "text-gray-700")}>
                  Mungkin Anda mencari:
                </span>
              </div>
              <div className="flex flex-wrap justify-center gap-3">
                {[
                  { label: 'Produk', path: '/#products' },
                  { label: 'Keranjang', path: '/cart' },
                  { label: 'Akun Saya', path: '/profile' },
                  { label: 'Bantuan', path: '/support' },
                ].map((link) => (
                  <Link
                    key={link.path}
                    to={link.path}
                    className={cn(
                      "px-4 py-2 rounded-full text-sm font-medium transition-all duration-300",
                      "hover:scale-105",
                      isDarkMode
                        ? "bg-gray-700 text-gray-300 hover:bg-gray-600 hover:text-white"
                        : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                    )}
                  >
                    {link.label}
                  </Link>
                ))}
              </div>
            </div>
          </FloatingElement>

          {/* Help Section */}
          <div className="mt-10 pt-8 border-t border-dashed border-gray-300 dark:border-gray-700">
            <div className="flex items-center justify-center gap-2 mb-4">
              <AlertTriangle className="h-5 w-5 text-orange-500" />
              <span className={cn("font-medium", isDarkMode ? "text-gray-400" : "text-gray-500")}>
                Butuh bantuan?
              </span>
            </div>
            <div className="flex justify-center gap-6 text-sm">
              <a
                href="mailto:support@layanandigital.id"
                className="text-blue-600 hover:text-blue-700 hover:underline transition-colors"
              >
                Email Support
              </a>
              <span className={isDarkMode ? "text-gray-700" : "text-gray-300"}>|</span>
              <a
                href="https://wa.me/6288992222666"
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-600 hover:text-blue-700 hover:underline transition-colors"
              >
                WhatsApp
              </a>
              <span className={isDarkMode ? "text-gray-700" : "text-gray-300"}>|</span>
              <Link
                to="/support"
                className="text-blue-600 hover:text-blue-700 hover:underline transition-colors"
              >
                Pusat Bantuan
              </Link>
            </div>
          </div>
        </div>

        {/* Decorative Elements */}
        <div className="absolute bottom-10 left-10 opacity-20">
          <div className="w-20 h-20 border-4 border-blue-500 rounded-full animate-ping" style={{ animationDuration: '3s' }} />
        </div>
        <div className="absolute top-20 right-20 opacity-20">
          <div className="w-16 h-16 border-4 border-orange-500 rotate-45 animate-ping" style={{ animationDuration: '4s', animationDelay: '1s' }} />
        </div>
      </div>
    </>
  );
}

export default NotFound;
