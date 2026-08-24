import { useState, useEffect, useCallback } from 'react';
import { useAppStore } from '@/store/appStore';
import { cn } from '@/lib/utils';

/**
 * BrandIntro — cinematic first-visit brand reveal.
 *
 * Psychology: brand reveal builds trust before the ask (no product pitch, no
 * feature tour). Short by design — 2.2s total, skippable at any moment, and
 * only ever shown once per browser (hasSeenWelcome is persisted).
 *
 * Assets are the project's real brand identity: the lightning-bolt mark from
 * public/favicon.svg and the #3B82F6 primary from manifest.json.
 */

const TOTAL_MS = 2200;

export function BrandIntro() {
  const { hasSeenWelcome, setHasSeenWelcome } = useAppStore();
  const [phase, setPhase] = useState<'mark' | 'name' | 'exit' | 'done'>('mark');

  const prefersReduced =
    typeof window !== 'undefined' &&
    window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

  const finish = useCallback(() => {
    setPhase('exit');
    setTimeout(() => {
      setPhase('done');
      setHasSeenWelcome(true);
    }, 420);
  }, [setHasSeenWelcome]);

  // Reduced motion: skip the reveal entirely, no forced wait.
  useEffect(() => {
    if (hasSeenWelcome) return;
    if (prefersReduced) {
      setHasSeenWelcome(true);
      setPhase('done');
      return;
    }
    const t1 = setTimeout(() => setPhase('name'), 700);
    const t2 = setTimeout(finish, TOTAL_MS);
    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, [hasSeenWelcome, prefersReduced, finish, setHasSeenWelcome]);

  // Escape / click / any key = escape hatch. Autonomy over spectacle.
  useEffect(() => {
    if (hasSeenWelcome || phase === 'done') return;
    const onKey = () => finish();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [hasSeenWelcome, phase, finish]);

  if (hasSeenWelcome || phase === 'done') return null;

  return (
    <div
      role="dialog"
      aria-label="Intro Layanan Digital"
      onClick={finish}
      className={cn(
        'fixed inset-0 z-[100] flex flex-col items-center justify-center bg-primary cursor-pointer',
        'transition-opacity duration-400 ease-out',
        phase === 'exit' ? 'opacity-0 pointer-events-none' : 'opacity-100'
      )}
    >
      {/* Brand mark — the lightning bolt from favicon.svg, drawn in place */}
      <svg
        viewBox="0 0 100 100"
        className={cn(
          'w-20 h-20 sm:w-24 sm:h-24 transition-all duration-700 ease-out',
          phase === 'mark' ? 'scale-90 opacity-0' : 'scale-100 opacity-100',
          phase === 'exit' && 'scale-110'
        )}
        aria-hidden="true"
      >
        <path
          d="M65 15 L40 45 L55 45 L35 85 L70 45 L50 45 Z"
          fill="white"
          stroke="white"
          strokeWidth="3"
          strokeLinejoin="round"
        />
      </svg>

      {/* Wordmark — arrives after the mark, staggered for hierarchy */}
      <div
        className={cn(
          'mt-5 text-center transition-all duration-500 ease-out',
          phase === 'mark' ? 'translate-y-3 opacity-0' : 'translate-y-0 opacity-100'
        )}
      >
        <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight text-primary-foreground">
          Layanan Digital
        </h1>
        <p className="mt-1.5 text-sm text-primary-foreground/70">
          Solusi digital profesional
        </p>
      </div>

      {/* Explicit escape — always visible, never hidden behind a timer */}
      <button
        onClick={(e) => { e.stopPropagation(); finish(); }}
        className="absolute bottom-10 text-xs font-medium text-primary-foreground/60 hover:text-primary-foreground transition-colors px-4 py-2"
      >
        Lewati
      </button>
    </div>
  );
}

export default BrandIntro;
