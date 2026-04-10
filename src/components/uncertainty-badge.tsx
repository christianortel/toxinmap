import type { ConfidenceLevel } from "@/types/data";
import { Badge } from "@/components/ui/badge";

export function UncertaintyBadge({
  level,
}: {
  level: ConfidenceLevel;
}) {
  const variant = level === "Low" ? "water" : level === "Moderate" ? "default" : "bio";

  return <Badge variant={variant}>Uncertainty: {level}</Badge>;
}
