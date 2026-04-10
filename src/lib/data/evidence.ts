import type {
  CompletenessTag,
  ConfidenceLevel,
  EvidenceKey,
  EvidenceType,
  GeographicLevel,
  LayerGroup,
  UpdateCadence,
} from "@/types/data";

export const evidenceMeta: Record<
  EvidenceType,
  {
    key: EvidenceKey;
    description: string;
    caution: string;
  }
> = {
  "Direct Measurement": {
    key: "direct_measurement",
    description:
      "Observed concentrations, reported discharges, facility attributes, or other records created through a defined protocol.",
    caution:
      "Direct measurement is still partial. It does not capture total cumulative exposure or downstream biological effect on its own.",
  },
  Proxy: {
    key: "proxy",
    description:
      "A contextual layer that raises plausibility or investigative relevance without acting as a direct exposure measurement.",
    caution:
      "Proxy layers should not be read as proof that contamination, transport, or harm definitely occurred.",
  },
  "Screening Signal": {
    key: "screening_signal",
    description:
      "An early-warning pattern that may justify deeper investigation before the public evidence base is mature.",
    caution:
      "Screening signals can be meaningful and uncertain at the same time, especially where denominator data are thin.",
  },
  "Literature Evidence": {
    key: "literature_evidence",
    description:
      "Published study or review context relevant to a geography, pathway, sentinel population, or contaminant class.",
    caution:
      "Literature may be site-specific, time-bound, or difficult to generalize to current conditions on the ground.",
  },
  "Editorial Case Study": {
    key: "editorial_case_study",
    description:
      "A narrative synthesis across sources, reporting, documents, and chronology used to explain why a place deserves scrutiny.",
    caution:
      "Editorial synthesis can clarify sequence and overlap, but it is not scientific proof on its own.",
  },
};

export const confidenceLabels: Record<ConfidenceLevel, string> = {
  Low: "High uncertainty",
  Moderate: "Moderate uncertainty",
  High: "Stronger structural confidence",
};

export const confidenceNotes: Record<ConfidenceLevel, string> = {
  Low: "Coverage is thin, case-specific, or methodologically narrow.",
  Moderate: "The record is useful but still partial, uneven, or interpretation-heavy.",
  High: "The source structure is relatively stable for the claim being made, though still incomplete outside scope.",
};

export const updateCadenceLabels: Record<UpdateCadence, string> = {
  daily: "Daily",
  monthly: "Monthly",
  quarterly: "Quarterly",
  annual: "Annual",
  periodic: "Periodic",
  irregular: "Irregular",
  static: "Static",
  planned: "Planned",
};

export const geographicLevelLabels: Record<GeographicLevel, string> = {
  facility: "Facility",
  site: "Site",
  watershed: "Watershed",
  county: "County",
  state: "State",
  regional: "Regional",
  national: "National",
  global: "Global",
  "literature-cluster": "Literature cluster",
};

export const completenessTagLabels: Record<CompletenessTag, string> = {
  "partial-coverage": "Partial coverage",
  "literature-context": "Literature context",
  "research-context": "Research context",
  "screening-only": "Screening only",
  "proxy-only": "Proxy only",
  "planned-placeholder": "Planned placeholder",
  "editorial-synthesis": "Editorial synthesis",
  "not-population-diagnostic": "Not population diagnostic",
};

export const layerGroupLabels: Record<LayerGroup, string> = {
  official: "Official",
  emerging: "Emerging",
  wildlife: "Wildlife",
  reproductive: "Reproductive",
  legal: "Legal",
};

export function getCompletenessLabels(tags: CompletenessTag[]) {
  return tags.map((tag) => completenessTagLabels[tag]);
}

export function getEvidenceSummary(evidenceType: EvidenceType) {
  return evidenceMeta[evidenceType];
}
