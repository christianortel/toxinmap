import type { EvidenceType } from "@/types/data";
import { Badge } from "@/components/ui/badge";

const variantMap: Record<EvidenceType, "default" | "industrial" | "bio" | "water"> = {
  "Direct Measurement": "industrial",
  Proxy: "default",
  "Screening Signal": "bio",
  "Literature Evidence": "water",
  "Editorial Case Study": "default",
};

export function EvidenceBadge({ evidence }: { evidence: EvidenceType }) {
  return <Badge variant={variantMap[evidence]}>{evidence}</Badge>;
}
