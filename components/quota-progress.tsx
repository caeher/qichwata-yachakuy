import {
  Progress,
  ProgressIndicator,
  ProgressTrack,
} from "@/components/ui/progress";
import { formatBytes } from "@/lib/format-bytes";

type Props = {
  label: string;
  used: number;
  limit: number;
  caption?: string;
};

export function QuotaProgress({ label, used, limit, caption }: Props) {
  const percent =
    limit > 0 ? Math.min(100, Math.round((used / limit) * 100)) : 0;

  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <p className="text-sm font-medium">{label}</p>
        <p className="text-muted-foreground text-sm">
          {formatBytes(used)} de {formatBytes(limit)}
        </p>
      </div>
      <Progress value={percent} aria-label={`${label}: ${percent} por ciento`}>
        <ProgressTrack>
          <ProgressIndicator />
        </ProgressTrack>
      </Progress>
      {caption ? (
        <p className="text-muted-foreground text-xs">{caption}</p>
      ) : null}
    </div>
  );
}
