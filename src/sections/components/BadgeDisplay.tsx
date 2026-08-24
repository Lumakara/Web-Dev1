import { useBadges } from '@/hooks/useBadges';

export function BadgeDisplay() {
  const { badges, getBadgeInfo } = useBadges();

  if (!badges.length) return (
    <div className="text-sm text-muted-foreground">
      Belum ada badge. Mulai berbelanja untuk mendapatkan badge pertamamu! 🏅
    </div>
  );

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
      {badges.map(b => {
        const info = getBadgeInfo(b.badge_type);
        return (
          <div key={b.badge_type} className="flex flex-col items-center gap-1 p-3 rounded-xl bg-muted/50 border border-muted text-center">
            <span className="text-3xl">{info.icon}</span>
            <span className="text-xs font-semibold">{info.label}</span>
            <span className="text-xs text-muted-foreground">{info.desc}</span>
            <span className="text-xs text-muted-foreground/60 mt-0.5">
              {new Date(b.earned_at).toLocaleDateString('id-ID')}
            </span>
          </div>
        );
      })}
    </div>
  );
}
