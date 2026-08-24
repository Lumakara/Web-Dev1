import { useEffect, useState } from 'react';

export function IntroSplash({ onComplete }: { onComplete: () => void }) {
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setProgress(prev => {
        if (prev >= 100) {
          clearInterval(timer);
          setTimeout(() => {
            sessionStorage.setItem('intro_shown', 'true');
            onComplete();
          }, 300);
          return 100;
        }
        return prev + 2;
      });
    }, 30);
    return () => clearInterval(timer);
  }, [onComplete]);

  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-gradient-to-br from-primary via-secondary to-primary animate-gradient">
      <style>{`
        @keyframes gradient { 0%, 100% { background-position: 0% 50%; } 50% { background-position: 100% 50%; } }
        .animate-gradient { background-size: 200% 200%; animation: gradient 3s ease infinite; }
        @keyframes fadeOut { to { opacity: 0; pointer-events: none; } }
        .fade-out { animation: fadeOut 0.5s ease-out forwards; }
      `}</style>
      
      <div className={`text-center ${progress === 100 ? 'fade-out' : ''}`}>
        <div className="w-24 h-24 bg-white rounded-full flex items-center justify-center mb-6 shadow-2xl animate-pulse">
          <svg className="w-16 h-16 text-primary" fill="currentColor" viewBox="0 0 20 20">
            <path d="M10 2a6 6 0 00-6 6v3.586l-.707.707A1 1 0 004 14h12a1 1 0 00.707-1.707L16 11.586V8a6 6 0 00-6-6zM10 18a3 3 0 01-3-3h6a3 3 0 01-3 3z" />
          </svg>
        </div>
        
        <h1 className="text-4xl font-bold text-white mb-2 tracking-tight">Lumakara Store</h1>
        <p className="text-white/80 text-sm mb-8">Solusi Jaringan & Keamanan Terpercaya</p>
        
        <div className="w-64 h-2 bg-white/30 rounded-full overflow-hidden">
          <div 
            className="h-full bg-white rounded-full transition-all duration-300 ease-out"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>
    </div>
  );
}
