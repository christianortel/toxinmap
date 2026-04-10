import type { FeaturedStat } from "@/types/data";

export function FeaturedStatisticBlock({ stat }: { stat: FeaturedStat }) {
  return (
    <div className="surface-panel-soft p-5">
      <p className="eyebrow mb-3">{stat.label}</p>
      <p className="stat-number text-white">{stat.value}</p>
      <p className="mt-3 body-sm">{stat.context}</p>
    </div>
  );
}
