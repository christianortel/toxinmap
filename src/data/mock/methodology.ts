import type {
  FeaturedStat,
  MethodologyNarrativeBlock,
  MethodologySection,
  TimelineStop,
  WarningCategory,
} from "@/types/data";

export const warningCategories: WarningCategory[] = [
  {
    key: "official",
    title: "Official Monitoring",
    summary:
      "Facilities, releases, permits, and enforcement records that have formal regulatory footprints.",
    accent: "var(--accent-industrial)",
  },
  {
    key: "emerging",
    title: "Emerging Chemicals",
    summary:
      "PFAS, pharmaceutical residues, and microplastic pathways that often outpace older compliance frameworks.",
    accent: "var(--accent-water)",
  },
  {
    key: "wildlife",
    title: "Wildlife Sentinels",
    summary:
      "Abnormalities in fish, amphibians, birds, and mammals that may act as early ecological warning signs.",
    accent: "var(--accent-bio)",
  },
  {
    key: "reproductive",
    title: "Reproductive Signals",
    summary:
      "Population-level fertility trends, infertility context, and literature-linked reproductive warning material.",
    accent: "var(--accent-bio-soft)",
  },
  {
    key: "legal",
    title: "Legal And Community Pressure",
    summary:
      "Litigation, settlements, enforcement records, and documented concern that may reveal unresolved exposure conflict.",
    accent: "var(--accent-warning)",
  },
];

export const featuredStats: FeaturedStat[] = [
  {
    label: "Evidence classes",
    value: "5",
    context: "Every relevant surface distinguishes direct measurement from proxy, screening, literature, and editorial synthesis.",
  },
  {
    label: "Core source families",
    value: "9+",
    context: "The U.S. map is organized around EPA, ATSDR, USGS, and carefully labeled research-reference inputs.",
  },
  {
    label: "Primary posture",
    value: "Careful overlap",
    context: "The map is built to investigate signal density, not to claim simple causation.",
  },
];

export const methodologyNarrativeBlocks: MethodologyNarrativeBlock[] = [
  {
    eyebrow: "What this is",
    title: "A U.S. toxin globe for overlap, sequence, and blind spots.",
    body:
      "toxinmap.com is not a causation engine. It is a public-interest exploration tool designed to compare how industrial records, emerging chemical concern, PFAS site records, wastewater pathways, wildlife warning signs, and legal pressure become visible through different institutions and at different times.",
  },
  {
    eyebrow: "What this is not",
    title: "Not every pattern on the globe is a measured exposure map.",
    body:
      "Some layers are direct measurements. Others are proxies, screening signals, literature context, or editorial case studies. A dense area can indicate overlap in records, but it should never be read as proof that a specific chemical caused a specific health outcome.",
  },
  {
    eyebrow: "Why wildlife matters",
    title: "Wildlife signals can matter before human-facing systems are complete.",
    body:
      "Sentinel species evidence can indicate ecological stress worth investigating. It is important precisely because it may emerge before a fully mature regulatory or public-health map exists. It is also important to label that evidence class clearly so it is not mistaken for one-to-one human proof.",
  },
];

export const methodologySections: MethodologySection[] = [
  {
    id: "direct-measurement",
    title: "Direct measurement",
    layerType: "Direct Measurement",
    measures:
      "Observed concentrations, reported discharges, facility attributes, or other records created through a defined monitoring or reporting protocol.",
    doesNotMeasure:
      "Total cumulative exposure, biological effect, personal dose, or ultimate health outcome.",
    caution:
      "Measured contamination is still partial. Monitoring is uneven across places, substances, and years.",
    examples: ["TRI release reporting", "SEMS site status", "Facility-level compliance records"],
  },
  {
    id: "proxy",
    title: "Proxy indicators",
    layerType: "Proxy",
    measures:
      "Nearby conditions that may increase plausibility of contamination or exposure, such as facility density, watershed position, or wastewater pathways.",
    doesNotMeasure:
      "Chemical concentration, confirmed transport, or direct biological harm.",
    caution:
      "Proxies are context layers. They should not be read as evidence that exposure definitely occurred.",
    examples: ["Watershed adjacency", "Industrial corridor density", "Wastewater outfall geography"],
  },
  {
    id: "screening-signal",
    title: "Screening signals",
    layerType: "Screening Signal",
    measures:
      "Early-warning patterns that may deserve attention, including wildlife abnormalities, partial community complaints, or research-led alerts.",
    doesNotMeasure:
      "Cause, magnitude of effect, or confirmed human-health mechanism.",
    caution:
      "Signals can matter before the evidence base is mature. That makes them both useful and uncertain.",
    examples: ["Sentinel fish abnormality clusters", "Early-warning ecological observations"],
  },
  {
    id: "literature",
    title: "Literature evidence",
    layerType: "Literature Evidence",
    measures:
      "Published studies, review findings, or documented scientific hypotheses relevant to a geography, pathway, or sentinel population.",
    doesNotMeasure:
      "Transferability to every location, every population, or current conditions on the ground.",
    caution:
      "Published evidence may be site-specific, time-bound, or difficult to generalize across communities.",
    examples: ["USGS research context", "Wildlife sentinel literature", "Reproductive context studies"],
  },
  {
    id: "editorial",
    title: "Editorial case study",
    layerType: "Editorial Case Study",
    measures:
      "Narrative synthesis across data, documents, interviews, and reporting context used to explain why a geography matters.",
    doesNotMeasure:
      "Scientific proof on its own.",
    caution:
      "Editorial synthesis can clarify sequence, overlap, and missingness. It must still remain separate from causal claims.",
    examples: ["Case-file synthesis", "Regulatory lag narrative", "Legal and reporting chronology"],
  },
];

export const timelineStops: TimelineStop[] = [
  {
    label: "Regulation era",
    year: 1974,
    summary: "Federal environmental regulation expands, but endocrine-disrupting and mixture concerns remain peripheral to most public map systems.",
  },
  {
    label: "Reporting era",
    year: 1996,
    summary: "Public pollutant reporting grows and facility footprints become more legible, while PFAS and pharmaceutical pathways remain fragmented.",
  },
  {
    label: "Detection era",
    year: 2007,
    summary: "Local detections, sampling campaigns, and study clusters begin to accumulate faster than comprehensive remediation systems.",
  },
  {
    label: "PFAS visibility",
    year: 2018,
    summary: "PFAS disclosure, litigation, wastewater concern, and broader public awareness accelerate across multiple states.",
  },
  {
    label: "Current view",
    year: 2025,
    summary: "Public registries remain uneven, but official, research, legal, and community signals are increasingly legible when viewed together.",
  },
];
