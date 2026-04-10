import type { SourceType } from "@/types/sources";
import { Badge } from "@/components/ui/badge";

const sourceVariantMap: Record<SourceType, "default" | "industrial" | "bio" | "water"> = {
  "Federal Registry": "industrial",
  "Federal Research": "water",
  "Academic Literature": "bio",
  Journalism: "default",
  "Global Statistical": "default",
  "Global Infrastructure": "industrial",
  "Hydrology Framework": "water",
};

export function SourceBadge({ type }: { type: SourceType }) {
  return <Badge variant={sourceVariantMap[type]}>{type}</Badge>;
}
