import { useBadges, BADGE_META } from '@/hooks/useBadges';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

interface Props {
  compact?: boolean;
}

export function BadgeDisplay({ compact = false }: Props) {
  const { badges, loading } = useBadges();

  if (loading || badges.length === 0) return null;

  if (compact) {
    return (
      <TooltipProvider>
        <div className="flex flex-wrap gap-1">
          {badges.slice(0, 4).map(b => {
            const meta = BADGE_META[b.badge_type];
            return (
              <Tooltip key={b.id}>
                <TooltipTrigger asChild>
                  <span className={`text-sm cursor-default border rounded-full px-2 py-0.5 text-xs font-medium ${meta.color}`}>
                    {meta.icon} {meta.label}
                  </span>
                </TooltipTrigger>
                <TooltipContent>
                  <p className="text-xs">{meta.desc}</p>
                </TooltipContent>
              </Tooltip>
            );
          })}
          {badges.length > 4 && (
            <span className="text-xs text-muted-foreground self-center">+{badges.length - 4}</span>
          )}
        </div>
      </TooltipProvider>
    );
  }

  return (
    <TooltipProvider>
      <div className="space-y-2">
        <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Pencapaian</h3>
        <div className="flex flex-wrap gap-2">
          {badges.map(b => {
            const meta = BADGE_META[b.badge_type];
            return (
              <Tooltip key={b.id}>
                <TooltipTrigger asChild>
                  <div className={`flex items-center gap-1.5 border rounded-full px-3 py-1.5 text-sm font-medium cursor-default ${meta.color}`}>
                    <span>{meta.icon}</span>
                    <span>{meta.label}</span>
                  </div>
                </TooltipTrigger>
                <TooltipContent>
                  <p className="text-xs">{meta.desc}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Diraih {new Date(b.earned_at).toLocaleDateString('id-ID')}
                  </p>
                </TooltipContent>
              </Tooltip>
            );
          })}
        </div>
      </div>
    </TooltipProvider>
  );
}
