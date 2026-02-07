import { useEffect, useRef, useCallback } from 'react';
import { cn } from '@/lib/utils';

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  color: string;
  alpha: number;
  pulse?: boolean;
}

interface ParticleBackgroundProps {
  className?: string;
  variant?: 'network' | 'snow' | 'stars' | 'bubbles' | 'confetti';
  density?: 'low' | 'medium' | 'high';
  isDarkMode?: boolean;
}

export function ParticleBackground({
  className,
  variant = 'network',
  density = 'medium',
  isDarkMode = false,
}: ParticleBackgroundProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const particlesRef = useRef<Particle[]>([]);
  const mouseRef = useRef({ x: 0, y: 0 });
  const animationRef = useRef<number | null>(null);

  const getParticleCount = (d: typeof density) => {
    const counts = { low: 30, medium: 60, high: 100 };
    return counts[d];
  };

  const createParticle = useCallback((width: number, height: number, _density: string): Particle => {
    const colors = isDarkMode
      ? ['#60A5FA', '#A78BFA', '#F472B6', '#34D399']
      : ['#3B82F6', '#8B5CF6', '#F97316', '#10B981'];

    switch (variant) {
      case 'snow':
        return {
          x: Math.random() * width,
          y: Math.random() * height,
          vx: (Math.random() - 0.5) * 0.5,
          vy: Math.random() * 1 + 0.5,
          size: Math.random() * 3 + 1,
          color: '#ffffff',
          alpha: Math.random() * 0.5 + 0.3,
        };
      case 'stars':
        return {
          x: Math.random() * width,
          y: Math.random() * height,
          vx: 0,
          vy: 0,
          size: Math.random() * 2,
          color: '#ffffff',
          alpha: Math.random(),
          pulse: true,
        };
      case 'bubbles':
        return {
          x: Math.random() * width,
          y: height + Math.random() * 100,
          vx: (Math.random() - 0.5) * 0.5,
          vy: -(Math.random() * 1 + 0.5),
          size: Math.random() * 20 + 5,
          color: colors[Math.floor(Math.random() * colors.length)],
          alpha: Math.random() * 0.3 + 0.1,
        };
      case 'confetti':
        return {
          x: Math.random() * width,
          y: -10,
          vx: (Math.random() - 0.5) * 2,
          vy: Math.random() * 3 + 2,
          size: Math.random() * 8 + 4,
          color: colors[Math.floor(Math.random() * colors.length)],
          alpha: 1,
        };
      default: // network
        return {
          x: Math.random() * width,
          y: Math.random() * height,
          vx: (Math.random() - 0.5) * 0.5,
          vy: (Math.random() - 0.5) * 0.5,
          size: Math.random() * 2 + 1,
          color: colors[Math.floor(Math.random() * colors.length)],
          alpha: Math.random() * 0.5 + 0.3,
        };
    }
  }, [variant, isDarkMode]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
      particlesRef.current = Array.from(
        { length: getParticleCount(density) },
        () => createParticle(canvas.width, canvas.height, density)
      );
    };

    const handleMouseMove = (e: MouseEvent) => {
      mouseRef.current = { x: e.clientX, y: e.clientY };
    };

    const drawNetwork = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      particlesRef.current.forEach((particle, i) => {
        // Update position
        particle.x += particle.vx;
        particle.y += particle.vy;

        // Wrap around edges
        if (particle.x < 0) particle.x = canvas.width;
        if (particle.x > canvas.width) particle.x = 0;
        if (particle.y < 0) particle.y = canvas.height;
        if (particle.y > canvas.height) particle.y = 0;

        // Draw particle
        ctx.beginPath();
        ctx.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2);
        ctx.fillStyle = particle.color;
        ctx.globalAlpha = particle.alpha;
        ctx.fill();

        // Draw connections
        particlesRef.current.slice(i + 1).forEach((other) => {
          const dx = particle.x - other.x;
          const dy = particle.y - other.y;
          const dist = Math.sqrt(dx * dx + dy * dy);

          if (dist < 150) {
            ctx.beginPath();
            ctx.moveTo(particle.x, particle.y);
            ctx.lineTo(other.x, other.y);
            ctx.strokeStyle = isDarkMode ? 'rgba(147, 197, 253,' : 'rgba(59, 130, 246,';
            ctx.globalAlpha = (1 - dist / 150) * 0.2;
            ctx.stroke();
          }
        });

        // Connect to mouse
        const dx = mouseRef.current.x - particle.x;
        const dy = mouseRef.current.y - particle.y;
        const dist = Math.sqrt(dx * dx + dy * dy);

        if (dist < 200) {
          ctx.beginPath();
          ctx.moveTo(particle.x, particle.y);
          ctx.lineTo(mouseRef.current.x, mouseRef.current.y);
          ctx.strokeStyle = particle.color;
          ctx.globalAlpha = (1 - dist / 200) * 0.3;
          ctx.stroke();
        }
      });

      ctx.globalAlpha = 1;
    };

    const drawSnow = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      particlesRef.current.forEach((particle) => {
        particle.x += particle.vx;
        particle.y += particle.vy;

        if (particle.y > canvas.height) {
          particle.y = -10;
          particle.x = Math.random() * canvas.width;
        }

        ctx.beginPath();
        ctx.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(255, 255, 255, ${particle.alpha})`;
        ctx.fill();
      });
    };

    const drawStars = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      particlesRef.current.forEach((particle) => {
        if (particle.pulse) {
          particle.alpha = 0.3 + Math.sin(Date.now() * 0.003) * 0.3;
        }

        ctx.beginPath();
        ctx.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(255, 255, 255, ${particle.alpha})`;
        ctx.fill();
      });
    };

    const drawBubbles = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      particlesRef.current.forEach((particle) => {
        particle.x += particle.vx;
        particle.y += particle.vy;

        if (particle.y < -50) {
          particle.y = canvas.height + 50;
          particle.x = Math.random() * canvas.width;
        }

        ctx.beginPath();
        ctx.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2);
        ctx.strokeStyle = particle.color;
        ctx.globalAlpha = particle.alpha;
        ctx.lineWidth = 1;
        ctx.stroke();
      });

      ctx.globalAlpha = 1;
    };

    const drawConfetti = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      particlesRef.current.forEach((particle) => {
        particle.x += particle.vx;
        particle.y += particle.vy;
        particle.vy += 0.1; // Gravity

        if (particle.y > canvas.height) {
          particle.y = -10;
          particle.x = Math.random() * canvas.width;
          particle.vy = Math.random() * 3 + 2;
        }

        ctx.fillStyle = particle.color;
        ctx.globalAlpha = particle.alpha;
        ctx.fillRect(particle.x, particle.y, particle.size, particle.size);
      });

      ctx.globalAlpha = 1;
    };

    const animate = () => {
      switch (variant) {
        case 'snow':
          drawSnow();
          break;
        case 'stars':
          drawStars();
          break;
        case 'bubbles':
          drawBubbles();
          break;
        case 'confetti':
          drawConfetti();
          break;
        default:
          drawNetwork();
      }

      animationRef.current = requestAnimationFrame(animate);
    };

    resize();
    window.addEventListener('resize', resize);
    window.addEventListener('mousemove', handleMouseMove);
    animate();

    return () => {
      window.removeEventListener('resize', resize);
      window.removeEventListener('mousemove', handleMouseMove);
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [variant, density, isDarkMode, createParticle]);

  return (
    <canvas
      ref={canvasRef}
      className={cn(
        'fixed inset-0 pointer-events-none',
        variant === 'network' && 'z-0',
        variant === 'snow' && 'z-50',
        variant === 'confetti' && 'z-50',
        className
      )}
    />
  );
}

export default ParticleBackground;
