export const siteConfig = {
  name: "toxinmap.com",
  tagline: "A U.S. toxin globe.",
  description:
    "A U.S.-first 3D globe for exploring toxic releases, PFAS context, wastewater pathways, and modeled contamination signals near real places.",
  navigation: [
    { href: "/", label: "Map" },
    { href: "/sources", label: "Sources" },
    { href: "/methodology", label: "Methodology" },
    { href: "/case-studies", label: "Case Studies" },
    { href: "/about", label: "About" },
  ],
} as const;

export const layerGroupLabels = {
  official: "Official",
  emerging: "Emerging",
  wildlife: "Wildlife",
  reproductive: "Reproductive",
  legal: "Legal",
} as const;
