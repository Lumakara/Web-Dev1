/**
 * ULTRA INTERACTIVE GIF PARTICLES & ANIMATIONS
 * Adds floating GIFs, cursor trails, and interactive particles
 */

import { useEffect, useRef, useState } from 'react';
import { Sparkles, Zap, Heart, Star } from 'lucide-react';
import { cn } from '@/lib/utils';

// ============================================
// TYPES
// ============================================

interface CursorTrail {
  x: number;
  y: number;
  id: number;
  icon: 'sparkles' | 'zap' | 'star' | 'heart';
  opacity: number;
  scale: number;
}

interface ClickParticle {
  icon: 'sparkles' | 'zap' | 'star' | 'heart';
  vx: number;
  vy: number;
  rotation: number;
  scale: number;
}

// ============================================
// ICON MAPPER
// ============================================

const ICON_MAP = {
  sparkles: Sparkles,
  zap: Zap,
  star: Star,
  heart: Heart,
} as const;

const ICON_POOL = ['sparkles', 'zap', 'star', 'heart'] as const;

const getRandomIcon = () => ICON_POOL[Math.floor(Math.random() * ICON_POOL.length)];

const COLORS = [
  '#3B82F6', '#8B5CF6', '#EC4899', '#F59E0B', 
  '#10B981', '#EF4444', '#06B6D4', '#F97316'
];

// ============================================
// CURSOR TRAIL EFFECT
// ============================================

export function CursorTrailEffect({
  enabled = true,
  icon = 'sparkles',
  maxTrails = 20,
}: {
  enabled?: boolean;
  icon?: 'sparkles' | 'zap' | 'star' | 'heart';
  maxTrails?: number;
}) {
  const [trails, setTrails] = useState<CursorTrail[]>([]);
  const idCounter = useRef(0);
  const lastPosition = useRef({ x: 0, y: 0 });

  useEffect(() => {
    if (!enabled) return;

    const handleMouseMove = (e: MouseEvent) => {
      const distance = Math.hypot(
        e.clientX - lastPosition.current.x,
        e.clientY - lastPosition.current.y
      );

      if (distance > 30) {
        lastPosition.current = { x: e.clientX, y: e.clientY };
        
        const newTrail: CursorTrail = {
          x: e.clientX,
          y: e.clientY,
          id: idCounter.current++,
          icon,
          opacity: 1,
          scale: 1,
        };

        setTrails(prev => [...prev.slice(-maxTrails + 1), newTrail]);
      }
    };

    window.addEventListener('mousemove', handleMouseMove, { passive: true });
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, [enabled, icon, maxTrails]);

  // Animate trails
  useEffect(() => {
    if (trails.length === 0) return;

    const interval = setInterval(() => {
      setTrails(prev => 
        prev
          .map(trail => ({
            ...trail,
            opacity: trail.opacity - 0.05,
            scale: trail.scale - 0.02,
            y: trail.y - 1,
          }))
          .filter(trail => trail.opacity > 0)
      );
    }, 50);

    return () => clearInterval(interval);
  }, [trails.length]);

  if (!enabled) return null;

  return (
    <div className="fixed inset-0 pointer-events-none z-50 overflow-hidden">
      {trails.map((trail) => {
        const IconComponent = ICON_MAP[trail.icon];
        return (
          <div
            key={trail.id}
            className="absolute transform -translate-x-1/2 -translate-y-1/2 transition-none"
            style={{
              left: trail.x,
              top: trail.y,
              opacity: trail.opacity,
              transform: `translate(-50%, -50%) scale(${trail.scale})`,
            }}
          >
            <IconComponent className="w-5 h-5 text-blue-500" />
          </div>
        );
      })}
    </div>
  );
}

// ============================================
// CLICK BURST EFFECT
// ============================================

export function ClickBurstEffect() {
  const [bursts, setBursts] = useState<Array<{
    id: number;
    x: number;
    y: number;
    particles: Array<ClickParticle>;
  }>>([]);
  const idCounter = useRef(0);

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      const particleCount = 8 + Math.floor(Math.random() * 8);
      
      const particles: ClickParticle[] = Array.from({ length: particleCount }, () => ({
        icon: getRandomIcon(),
        vx: (Math.random() - 0.5) * 10,
        vy: (Math.random() - 0.5) * 10 - 3,
        rotation: Math.random() * 360,
        scale: 0.5 + Math.random() * 0.8,
      }));

      setBursts(prev => [...prev, {
        id: idCounter.current++,
        x: e.clientX,
        y: e.clientY,
        particles,
      }]);
    };

    window.addEventListener('click', handleClick);
    return () => window.removeEventListener('click', handleClick);
  }, []);

  // Animate bursts
  useEffect(() => {
    if (bursts.length === 0) return;

    const interval = setInterval(() => {
      setBursts(prev => {
        const updated = prev.map(burst => ({
          ...burst,
          particles: burst.particles.map(p => ({
            ...p,
            vx: p.vx * 0.95,
            vy: p.vy + 0.2,
            rotation: p.rotation + 5,
            scale: p.scale * 0.98,
          })).filter(p => p.scale > 0.1),
        })).filter(b => b.particles.length > 0);

        return updated;
      });
    }, 30);

    return () => clearInterval(interval);
  }, [bursts.length]);

  return (
    <div className="fixed inset-0 pointer-events-none z-50 overflow-hidden">
      {bursts.map((burst) => (
        <div key={burst.id}>
          {burst.particles.map((particle, i) => {
            const IconComponent = ICON_MAP[particle.icon];
            return (
              <div
                key={i}
                className="absolute transform -translate-x-1/2 -translate-y-1/2"
                style={{
                  left: burst.x + particle.vx * 10,
                  top: burst.y + particle.vy * 10,
                  transform: `translate(-50%, -50%) rotate(${particle.rotation}deg) scale(${particle.scale})`,
                }}
              >
                <IconComponent className="w-6 h-6 text-purple-500" />
              </div>
            );
          })}
        </div>
      ))}
    </div>
  );
}

// ============================================
// LOADING ANIMATION WITH GIF STYLE
// ============================================

export function UltraLoadingSpinner({
  size = 'md',
  text,
  className,
}: {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  text?: string;
  className?: string;
}) {
  const sizeClasses = {
    sm: 'w-8 h-8',
    md: 'w-12 h-12',
    lg: 'w-16 h-16',
    xl: 'w-24 h-24',
  };

  return (
    <div className={cn("flex flex-col items-center justify-center gap-4", className)}>
      <div className={cn("relative", sizeClasses[size])}>
        {/* Outer ring */}
        <div className="absolute inset-0 rounded-full border-4 border-border" />
        
        {/* Animated primary ring */}
        <div 
          className="absolute inset-0 rounded-full border-4 border-transparent border-t-primary animate-spin"
          style={{ animationDuration: '1s' }}
        />
        
        {/* Inner pulsing circle */}
        <div className="absolute inset-2 rounded-full bg-primary animate-pulse" />
        
        {/* Center icon */}
        <div className="absolute inset-0 flex items-center justify-center">
          <Zap className="w-5 h-5 animate-bounce text-primary-foreground" />
        </div>
      </div>
      
      {text && (
        <p className="text-sm text-gray-600 dark:text-gray-400 animate-pulse">
          {text}
        </p>
      )}
    </div>
  );
}

// ============================================
// CELEBRATION EFFECT
// ============================================

export function CelebrationEffect({ 
  active, 
  onComplete 
}: { 
  active: boolean;
  onComplete?: () => void;
}) {
  const [particles, setParticles] = useState<Array<{
    id: number;
    x: number;
    y: number;
    icon: 'sparkles' | 'zap' | 'star' | 'heart';
    vx: number;
    vy: number;
    rotation: number;
    scale: number;
    color: string;
  }>>([]);

  useEffect(() => {
    if (!active) return;

    // Create explosion of particles
    const newParticles = Array.from({ length: 50 }, (_, i) => ({
      id: i,
      x: window.innerWidth / 2,
      y: window.innerHeight / 2,
      icon: getRandomIcon(),
      vx: (Math.random() - 0.5) * 20,
      vy: (Math.random() - 0.5) * 20 - 10,
      rotation: Math.random() * 360,
      scale: 0.5 + Math.random() * 1,
      color: COLORS[Math.floor(Math.random() * COLORS.length)],
    }));

    setParticles(newParticles);

    // Auto cleanup
    const timer = setTimeout(() => {
      setParticles([]);
      onComplete?.();
    }, 3000);

    return () => clearTimeout(timer);
  }, [active, onComplete]);

  // Animate particles
  useEffect(() => {
    if (particles.length === 0) return;

    const interval = setInterval(() => {
      setParticles(prev => {
        const updated = prev.map(p => ({
          ...p,
          x: p.x + p.vx,
          y: p.y + p.vy,
          vy: p.vy + 0.5,
          vx: p.vx * 0.98,
          rotation: p.rotation + 10,
          scale: p.scale * 0.99,
        })).filter(p => p.scale > 0.1 && p.y < window.innerHeight + 100);

        return updated;
      });
    }, 20);

    return () => clearInterval(interval);
  }, [particles.length]);

  if (!active && particles.length === 0) return null;

  return (
    <div className="fixed inset-0 pointer-events-none z-50 overflow-hidden">
      {particles.map((p) => {
        const IconComponent = ICON_MAP[p.icon];
        return (
          <div
            key={p.id}
            className="absolute transform -translate-x-1/2 -translate-y-1/2"
            style={{
              left: p.x,
              top: p.y,
              transform: `translate(-50%, -50%) rotate(${p.rotation}deg) scale(${p.scale})`,
              color: p.color,
            }}
          >
            <IconComponent className="w-6 h-6" />
          </div>
        );
      })}
    </div>
  );
}

// ============================================
// HOVER FLOAT EFFECT
// ============================================

export function HoverFloatEffect({ 
  children, 
  className 
}: { 
  children: React.ReactNode;
  className?: string;
}) {
  const [isHovered, setIsHovered] = useState(false);
  const [particles, setParticles] = useState<Array<{
    id: number;
    x: number;
    y: number;
    icon: 'sparkles' | 'zap' | 'star' | 'heart';
    life: number;
  }>>([]);
  const idCounter = useRef(0);

  useEffect(() => {
    if (!isHovered) return;

    const interval = setInterval(() => {
      setParticles(prev => [
        ...prev.slice(-5),
        {
          id: idCounter.current++,
          x: Math.random() * 100,
          y: 100,
          icon: getRandomIcon(),
          life: 1,
        },
      ]);
    }, 200);

    return () => clearInterval(interval);
  }, [isHovered]);

  useEffect(() => {
    if (particles.length === 0) return;

    const interval = setInterval(() => {
      setParticles(prev =>
        prev
          .map(p => ({ ...p, y: p.y - 2, life: p.life - 0.05 }))
          .filter(p => p.life > 0)
      );
    }, 50);

    return () => clearInterval(interval);
  }, [particles.length]);

  return (
    <div
      className={cn("relative", className)}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {children}
      
      {/* Floating particles */}
      {particles.map(p => {
        const IconComponent = ICON_MAP[p.icon];
        return (
          <div
            key={p.id}
            className="absolute pointer-events-none"
            style={{
              left: `${p.x}%`,
              top: `${p.y}%`,
              opacity: p.life,
            }}
          >
            <IconComponent className="w-4 h-4 text-blue-500" />
          </div>
        );
      })}
    </div>
  );
}

// ============================================
// SCROLL REVEAL ANIMATION
// ============================================

export function ScrollReveal({
  children,
  className,
  direction = 'up',
  delay = 0,
}: {
  children: React.ReactNode;
  className?: string;
  direction?: 'up' | 'down' | 'left' | 'right';
  delay?: number;
}) {
  const [isVisible, setIsVisible] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setTimeout(() => setIsVisible(true), delay);
        }
      },
      { threshold: 0.1, rootMargin: '0px 0px -50px 0px' }
    );

    if (ref.current) {
      observer.observe(ref.current);
    }

    return () => observer.disconnect();
  }, [delay]);

  const directionClasses = {
    up: 'translate-y-10',
    down: '-translate-y-10',
    left: 'translate-x-10',
    right: '-translate-x-10',
  };

  return (
    <div
      ref={ref}
      className={cn(
        "transition-all duration-700 ease-out",
        directionClasses[direction],
        isVisible ? 'opacity-100 translate-x-0 translate-y-0' : 'opacity-0',
        className
      )}
    >
      {children}
    </div>
  );
}

// ============================================
// TYPING TEXT EFFECT
// ============================================

export function TypingText({
  text,
  className,
  speed = 50,
  onComplete,
}: {
  text: string;
  className?: string;
  speed?: number;
  onComplete?: () => void;
}) {
  const [displayedText, setDisplayedText] = useState('');
  const [showCursor, setShowCursor] = useState(true);

  useEffect(() => {
    let index = 0;
    const interval = setInterval(() => {
      if (index <= text.length) {
        setDisplayedText(text.slice(0, index));
        index++;
      } else {
        clearInterval(interval);
        setTimeout(() => setShowCursor(false), 500);
        onComplete?.();
      }
    }, speed);

    return () => clearInterval(interval);
  }, [text, speed, onComplete]);

  return (
    <span className={className}>
      {displayedText}
      {showCursor && (
        <span className="animate-pulse">|</span>
      )}
    </span>
  );
}

// ============================================
// SHIMMER EFFECT
// ============================================

export function ShimmerEffect({ 
  children, 
  className 
}: { 
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("relative overflow-hidden", className)}>
      {children}
      <div 
        className="absolute inset-0 -translate-x-full animate-[shimmer_2s_infinite] bg-white/20"
      />
    </div>
  );
}

// ============================================
// EXPORT ALL
// ============================================

export default {
  CursorTrailEffect,
  ClickBurstEffect,
  UltraLoadingSpinner,
  CelebrationEffect,
  HoverFloatEffect,
  ScrollReveal,
  TypingText,
  ShimmerEffect,
};
