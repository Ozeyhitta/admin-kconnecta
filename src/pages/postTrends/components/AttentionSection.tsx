import { AlertTriangle, Hash, TrendingDown } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import type { AttentionCategory, AttentionGroup } from "../lib/postTrendsAnalytics";
import { fmt } from "../utils";

const ICONS: Record<AttentionCategory, React.FC<{ className?: string }>> = {
  reported: AlertTriangle,
  negative_score: TrendingDown,
  no_hashtag: Hash,
};

const COLORS: Record<AttentionCategory, string> = {
  reported: "text-red-500",
  negative_score: "text-amber-600",
  no_hashtag: "text-slate-500",
};

type AttentionSectionProps = {
  groups: AttentionGroup[];
  loading: boolean;
  onSelect: (category: AttentionCategory) => void;
};

export function AttentionSection({ groups, loading, onSelect }: AttentionSectionProps) {
  if (loading) {
    return (
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-24 w-full rounded-lg" />
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
      {groups.map((group) => {
        const Icon = ICONS[group.id];
        return (
          <button
            key={group.id}
            type="button"
            disabled={group.count === 0}
            onClick={() => onSelect(group.id)}
            className="text-left disabled:cursor-not-allowed disabled:opacity-60"
          >
            <Card className="rounded-lg border p-4 transition-colors hover:bg-muted/30 h-full">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-sm font-medium">{group.label}</p>
                  <p className="mt-1 text-2xl font-bold tabular-nums">{fmt.format(group.count)}</p>
                  <p className="mt-1 text-xs text-muted-foreground line-clamp-2">{group.description}</p>
                </div>
                <Icon className={`h-5 w-5 shrink-0 ${COLORS[group.id]}`} />
              </div>
            </Card>
          </button>
        );
      })}
    </div>
  );
}
