import type { CaseStudyRecord } from "@/types/data";

export const mockCaseStudies: CaseStudyRecord[] = [
  {
    id: "case-cape-fear",
    slug: "cape-fear-pfas-plume",
    title: "Cape Fear PFAS plume",
    subtitle: "A downstream river story shaped by industrial discharge, delayed public visibility, and drinking-water concern.",
    location: "Cape Fear River Basin",
    region: "North Carolina, United States",
    coordinates: [-78.8, 34.2],
    dateRangeLabel: "2006-2024",
    category: "PFAS contamination",
    summary:
      "A river corridor where industrial reporting, PFAS research context, and downstream treatment concern become visible on different timelines.",
    whyItMatters:
      "This case helps explain how official systems, emerging chemical evidence, and editorial scrutiny can converge long after exposure concern has already entered community life.",
    methodologyNote:
      "The case study separates direct measurement, proxy industrial context, and editorial reporting. It does not claim a complete exposure history or mechanistic proof.",
    evidenceMix: ["Direct Measurement", "Literature Evidence", "Editorial Case Study", "Proxy"],
    confidenceLevel: "Moderate",
    keySignals: [
      "Fluorochemical manufacturing context",
      "Downstream drinking-water vulnerability",
      "Disclosure lag",
      "Regulatory and public-awareness timing mismatch",
    ],
    keyFindings: [
      "The most visible public map often arrives after community concern is already underway.",
      "PFAS-related monitoring context remains partial even in prominent cases.",
      "Industrial geography and downstream dependency need to be interpreted together, not collapsed into one layer.",
    ],
    narrative: [
      "This case study is framed around public reporting, state and federal monitoring, and the geography of downstream exposure concern.",
      "The atlas treats the basin as an overlap zone rather than a proof-of-causation machine, keeping facility data, water context, and public-health concern visibly separate.",
      "Editorial annotations focus on sequence: discharge, detection, regulation, and community awareness did not arrive at the same time.",
    ],
    tags: ["pfas", "downstream", "drinking-water", "regulatory-lag"],
    sourceIds: ["epa-tri", "epa-frs", "usgs-pfas", "editorial-reporting"],
    relatedEntityIds: ["pfas-fayetteville-outfall", "cape-fear-industrial-complex", "cape-fear-warning-story"],
    hero: {
      eyebrow: "Featured case",
      imageHint: "Dark river basin at dusk with industrial glow on the horizon",
    },
  },
  {
    id: "case-great-lakes",
    slug: "great-lakes-sentinel-fish",
    title: "Great Lakes sentinel fish anomalies",
    subtitle: "Wildlife signals and industrial freshwater legacy in a basin where literature often outran policy clarity.",
    location: "Lower Great Lakes",
    region: "Great Lakes Basin",
    coordinates: [-79.4, 43.3],
    dateRangeLabel: "1993-2022",
    category: "Wildlife sentinel warning",
    summary:
      "A literature-led case where fish abnormalities, legacy shoreline industry, and ecological unease become legible long before clean public consensus exists.",
    whyItMatters:
      "This case makes the central project rule visible: wildlife evidence matters, but it is not one-to-one human proof.",
    methodologyNote:
      "The case is explicitly built from literature evidence and screening signals. It should not be read as a direct human-outcome claim.",
    evidenceMix: ["Literature Evidence", "Screening Signal", "Editorial Case Study"],
    confidenceLevel: "Moderate",
    keySignals: ["Fish intersex and lesion reporting", "Legacy industrial shoreline burden", "Complex freshwater mixture exposure context"],
    keyFindings: [
      "Sentinel evidence can signal ecological stress before human-facing maps become institutionally routine.",
      "Study methods and species coverage vary, which makes synthesis necessary and careful interpretation essential.",
    ],
    narrative: [
      "This story centers on sentinel species findings and freshwater-industrial geography rather than a single point-source accusation.",
      "Signals shown here are explicitly marked as wildlife evidence and screening context, not human-effect proof.",
      "The editorial framing emphasizes how ecological observation can precede direct human exposure clarity.",
    ],
    tags: ["wildlife", "freshwater", "screening-signal"],
    sourceIds: ["epa-sems", "literature-sentinel", "editorial-reporting"],
    relatedEntityIds: ["great-lakes-fish-sentinel", "niagara-hazard-site"],
    hero: {
      eyebrow: "Sentinel species",
      imageHint: "Cold freshwater shoreline and research sampling scene",
    },
  },
  {
    id: "case-gulf-corridor",
    slug: "gulf-coast-petrochemical-corridor",
    title: "Gulf Coast petrochemical corridor",
    subtitle: "A corridor-scale story about density, cumulative burden, and the limits of officially tidy maps.",
    location: "Lower Mississippi industrial corridor",
    region: "Louisiana, United States",
    coordinates: [-91.25, 30.05],
    dateRangeLabel: "1990-2025",
    category: "Industrial corridor",
    summary:
      "A dense industrial corridor where facility presence, power infrastructure, reproductive context, and legal pressure sit on top of one another without collapsing into proof.",
    whyItMatters:
      "This case makes visible how communities can inhabit multiple overlapping records at once: permits, emissions, lawsuits, health concern, and incomplete monitoring.",
    methodologyNote:
      "The case combines direct regulatory records, proxy burden indicators, and editorial context. It does not imply mechanistic causal attribution.",
    evidenceMix: ["Direct Measurement", "Proxy", "Editorial Case Study", "Literature Evidence"],
    confidenceLevel: "Moderate",
    keySignals: ["High facility density", "Air and water pathway overlap", "Community concern and legal pressure", "Population-level reproductive context"],
    keyFindings: [
      "Corridor-scale density is itself an investigative fact, even before outcome interpretation begins.",
      "Regulatory visibility and lived burden perception do not always move at the same pace.",
    ],
    narrative: [
      "This case study assembles multiple official and community-facing records into a single geographic narrative without claiming mechanistic causation.",
      "Facilities, demographics, permits, and legal pressure are shown as adjacent signals that need interpretation, not automation.",
      "The interface is meant to slow the viewer down and show what is known, what is inferred, and what remains unmeasured.",
    ],
    tags: ["industrial-corridor", "legal-pressure", "community-health-context"],
    sourceIds: ["epa-tri", "epa-echo", "egrid-eia", "cdc-ephtracking", "editorial-reporting"],
    relatedEntityIds: ["gulf-coast-cracker", "gulf-coast-power-plant", "gulf-reproductive-region", "ohio-river-consent-marker"],
    hero: {
      eyebrow: "Corridor profile",
      imageHint: "Night industrial corridor with river and stacks under low cloud",
    },
  },
  {
    id: "case-midwest-biosolids",
    slug: "midwest-biosolids-and-farms",
    title: "Midwest biosolids and farm exposure questions",
    subtitle: "Diffuse soil, private-well, and wastewater pathways in places where monitoring is thin and the map is incomplete.",
    location: "Upper Midwest agricultural counties",
    region: "Michigan and Wisconsin",
    coordinates: [-87.9, 44.8],
    dateRangeLabel: "2014-2025",
    category: "Wastewater and agricultural pathway",
    summary:
      "A rural contamination story where wastewater residuals, farm concerns, and reproductive context appear through partial datasets and broad regional framing.",
    whyItMatters:
      "Diffuse landscapes are often the hardest to see in public datasets, even when the concern is immediate for households, farms, and private wells.",
    methodologyNote:
      "This case deliberately uses proxy and literature-context framing where direct public spatial measurements are limited.",
    evidenceMix: ["Proxy", "Direct Measurement", "Editorial Case Study"],
    confidenceLevel: "Moderate",
    keySignals: ["Wastewater-to-soil pathway", "Private well uncertainty", "Sparse reproductive context", "Rural monitoring gaps"],
    keyFindings: [
      "Diffuse pathways force the atlas to use regional context and careful caveats instead of false precision.",
      "The absence of a clean public map is itself part of the investigative story.",
    ],
    narrative: [
      "This case study focuses on the difficulty of seeing contamination once wastewater residuals leave an urban plant and enter diffuse landscapes.",
      "The atlas uses this story to frame agricultural overlays, uncertainty notes, and source-linked drawer content.",
      "The editorial posture stays careful: pathways may be plausible, but monitoring is irregular and denominator data are thin.",
    ],
    tags: ["biosolids", "private-wells", "reproductive-context"],
    sourceIds: ["usgs-pharma", "usgs-pfas", "cdc-ephtracking", "editorial-reporting"],
    relatedEntityIds: ["biosolids-farm-region", "lake-michigan-wastewater", "midwest-warning-story"],
    hero: {
      eyebrow: "Diffuse pathway",
      imageHint: "Agricultural fields, drainage ditches, and overcast rural horizon",
    },
  },
  {
    id: "case-delaware-pharma",
    slug: "delaware-pharmaceutical-estuary",
    title: "Delaware estuary pharmaceutical context",
    subtitle: "Wastewater, microcontaminant research, and the difference between pathway visibility and complete monitoring coverage.",
    location: "Delaware Estuary",
    region: "Mid-Atlantic, United States",
    coordinates: [-75.2, 39.4],
    dateRangeLabel: "2009-2025",
    category: "Wastewater / pharmaceutical discharge",
    summary:
      "A case anchored in wastewater and pharmaceutical research context, where the strongest public record may be pathway infrastructure rather than complete chemical coverage.",
    whyItMatters:
      "The project needs to show how emerging concerns can be real investigative material even when the data model is fragmented and research-led.",
    methodologyNote:
      "This case is framed as research context and proxy infrastructure, not a complete direct-measurement atlas of pharmaceutical contamination.",
    evidenceMix: ["Literature Evidence", "Proxy", "Editorial Case Study"],
    confidenceLevel: "Moderate",
    keySignals: ["Wastewater discharge infrastructure", "Pharmaceutical residue research context", "Estuarine ecological sensitivity"],
    keyFindings: [
      "Research visibility can exist without a clean operational map suitable for public-facing certainty.",
      "Emerging contaminant storytelling should stay explicit about scope and missingness.",
    ],
    narrative: [
      "This case uses the Delaware estuary to show the difference between infrastructure visibility and contaminant certainty.",
      "Wastewater systems provide a strong geographic frame, but compound-level coverage remains uneven and research-led.",
      "That gap is not a reason to ignore the story; it is a reason to label the evidence class carefully.",
    ],
    tags: ["wastewater", "pharmaceuticals", "research-context"],
    sourceIds: ["usgs-pharma", "usgs-hydrography", "editorial-reporting"],
    relatedEntityIds: ["delaware-outfall"],
    hero: {
      eyebrow: "Estuary context",
      imageHint: "Tidal industrial estuary with muted city glow and dark water",
    },
  },
  {
    id: "case-ohio-legal",
    slug: "ohio-river-consent-decree",
    title: "Ohio River consent decree watershed",
    subtitle: "Enforcement and legal pressure as early public-interest signals in an industrial watershed.",
    location: "Upper Ohio industrial watershed",
    region: "Ohio River Basin",
    coordinates: [-80.7, 39.9],
    dateRangeLabel: "2001-2025",
    category: "Legal settlement / regulatory blind spot",
    summary:
      "A legal-pressure case that shows how consent decrees and community challenge can make a watershed legible before exposure science feels complete.",
    whyItMatters:
      "Not every warning enters the public record through monitoring first. Sometimes the clearest visible trail is legal.",
    methodologyNote:
      "This case is intentionally labeled as editorial and legal context. It is not a direct contamination measurement layer.",
    evidenceMix: ["Editorial Case Study", "Proxy", "Literature Evidence"],
    confidenceLevel: "Moderate",
    keySignals: ["Consent decree visibility", "Enforcement-driven documentation", "Community pressure before full clarity"],
    keyFindings: [
      "Legal visibility is often a clue to investigate, not a substitute for exposure measurement.",
      "Regulatory blind spots can coexist with dense administrative paperwork.",
    ],
    narrative: [
      "This case frames legal pressure as an investigative surface rather than a definitive scientific answer.",
      "Consent decrees, enforcement histories, and community documentation often reveal a geography worth examining more closely.",
      "The atlas preserves that distinction by marking the case as editorial and legal context rather than direct proof.",
    ],
    tags: ["legal", "consent-decree", "regulatory-blind-spot"],
    sourceIds: ["epa-echo", "editorial-reporting"],
    relatedEntityIds: ["ohio-river-consent-marker"],
    hero: {
      eyebrow: "Legal context",
      imageHint: "Industrial river valley with archive-paper editorial mood",
    },
  },
];
