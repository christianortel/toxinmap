import type { GeographyRecord } from "@/types/data";

export const mockGeographies: GeographyRecord[] = [
  {
    id: "geo-cape-fear",
    slug: "cape-fear-river-basin",
    name: "Cape Fear River Basin",
    geographicLevel: "watershed",
    countryCode: "US",
    stateCode: "NC",
    summary: "Downstream drinking-water basin used for PFAS and industrial discharge context.",
  },
  {
    id: "geo-great-lakes",
    slug: "lower-great-lakes",
    name: "Lower Great Lakes",
    geographicLevel: "regional",
    countryCode: "US",
    summary: "Freshwater industrial-literature geography used for sentinel fish warning narratives.",
  },
  {
    id: "geo-gulf-corridor",
    slug: "lower-mississippi-industrial-corridor",
    name: "Lower Mississippi industrial corridor",
    geographicLevel: "regional",
    countryCode: "US",
    stateCode: "LA",
    summary: "High-density industrial corridor used for cumulative burden and legal-pressure context.",
  },
  {
    id: "geo-midwest-farms",
    slug: "upper-midwest-agricultural-counties",
    name: "Upper Midwest agricultural counties",
    geographicLevel: "regional",
    countryCode: "US",
    summary: "Diffuse regional geography for biosolids, private-well, and reproductive-context narratives.",
  },
  {
    id: "geo-delaware-estuary",
    slug: "delaware-estuary",
    name: "Delaware Estuary",
    geographicLevel: "watershed",
    countryCode: "US",
    summary: "Estuary geography for wastewater and pharmaceutical research context.",
  },
  {
    id: "geo-ohio-river",
    slug: "upper-ohio-industrial-watershed",
    name: "Upper Ohio industrial watershed",
    geographicLevel: "watershed",
    countryCode: "US",
    summary: "Industrial watershed geography used for enforcement and legal-pressure storytelling.",
  },
];
