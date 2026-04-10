import {
  boolean,
  customType,
  integer,
  jsonb,
  numeric,
  pgEnum,
  pgTable,
  serial,
  text,
  timestamp,
  varchar,
} from "drizzle-orm/pg-core";

const geometry = customType<{ data: string }>({
  dataType() {
    return "geometry(Geometry, 4326)";
  },
});

const pointGeometry = customType<{ data: string }>({
  dataType() {
    return "geometry(Point, 4326)";
  },
});

export const layerGroupEnum = pgEnum("layer_group", [
  "official",
  "emerging",
  "wildlife",
  "reproductive",
  "legal",
]);

export const evidenceTypeEnum = pgEnum("evidence_type", [
  "direct_measurement",
  "proxy",
  "screening_signal",
  "literature_evidence",
  "editorial_case_study",
]);

export const confidenceLevelEnum = pgEnum("confidence_level", [
  "low",
  "moderate",
  "high",
]);

export const sourceTypeEnum = pgEnum("source_type", [
  "federal_registry",
  "federal_research",
  "academic_literature",
  "journalism",
  "global_statistical",
  "global_infrastructure",
  "hydrology_framework",
]);

export const geographicLevelEnum = pgEnum("geographic_level", [
  "facility",
  "site",
  "watershed",
  "county",
  "state",
  "regional",
  "national",
  "global",
  "literature_cluster",
]);

export const updateCadenceEnum = pgEnum("update_cadence", [
  "daily",
  "monthly",
  "quarterly",
  "annual",
  "periodic",
  "irregular",
  "static",
  "planned",
]);

export const sourceLifecycleEnum = pgEnum("source_lifecycle", ["active_mock", "planned"]);

export const sourceProgramTierEnum = pgEnum("source_program_tier", [
  "us_v1_core",
  "global_v2_planned",
  "literature_editorial",
]);

const auditColumns = {
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
};

const sourceColumns = {
  sourceIds: jsonb("source_ids").$type<string[]>().default([]).notNull(),
  sourceName: text("source_name"),
  sourceUrl: text("source_url"),
  sourceUpdatedAt: timestamp("source_updated_at", { withTimezone: true }),
  ingestionVersion: varchar("ingestion_version", { length: 64 }).default("v1_draft"),
};

const classificationColumns = {
  category: text("category"),
  subcategory: text("subcategory"),
  layerGroup: layerGroupEnum("layer_group").notNull(),
  evidenceType: evidenceTypeEnum("evidence_type").notNull(),
  confidenceLevel: confidenceLevelEnum("confidence_level").default("moderate").notNull(),
  geographicLevel: geographicLevelEnum("geographic_level").notNull(),
  summary: text("summary"),
  notes: text("notes"),
  tags: jsonb("tags").$type<string[]>().default([]).notNull(),
};

export const geographies = pgTable("geographies", {
  id: serial("id").primaryKey(),
  slug: varchar("slug", { length: 140 }).notNull().unique(),
  name: text("name").notNull(),
  geographyType: varchar("geography_type", { length: 64 }).notNull(),
  geographicLevel: geographicLevelEnum("geographic_level").notNull(),
  summary: text("summary"),
  notes: text("notes"),
  stateCode: varchar("state_code", { length: 2 }),
  countryCode: varchar("country_code", { length: 2 }).default("US"),
  centroid: pointGeometry("centroid"),
  boundary: geometry("boundary"),
  metadata: jsonb("metadata").$type<Record<string, unknown>>().default({}).notNull(),
  ...sourceColumns,
  ...auditColumns,
});

export const industrialSites = pgTable("industrial_sites", {
  id: serial("id").primaryKey(),
  slug: varchar("slug", { length: 160 }).unique(),
  geographyId: integer("geography_id").references(() => geographies.id),
  facilityName: text("facility_name").notNull(),
  operatorName: text("operator_name"),
  naicsCode: varchar("naics_code", { length: 12 }),
  status: varchar("status", { length: 64 }),
  location: pointGeometry("location"),
  activeYear: integer("active_year"),
  dateRangeLabel: varchar("date_range_label", { length: 64 }),
  ...classificationColumns,
  ...sourceColumns,
  metadata: jsonb("metadata").$type<Record<string, unknown>>().default({}).notNull(),
  ...auditColumns,
});

export const toxicReleaseRecords = pgTable("toxic_release_records", {
  id: serial("id").primaryKey(),
  siteId: integer("site_id").references(() => industrialSites.id),
  recordTitle: text("record_title"),
  chemicalName: text("chemical_name").notNull(),
  casNumber: varchar("cas_number", { length: 40 }),
  reportingYear: integer("reporting_year").notNull(),
  quantityKg: numeric("quantity_kg", { precision: 14, scale: 2 }),
  releaseMedium: varchar("release_medium", { length: 64 }),
  ...classificationColumns,
  ...sourceColumns,
  metadata: jsonb("metadata").$type<Record<string, unknown>>().default({}).notNull(),
  ...auditColumns,
});

export const powerPlants = pgTable("power_plants", {
  id: serial("id").primaryKey(),
  slug: varchar("slug", { length: 160 }).unique(),
  geographyId: integer("geography_id").references(() => geographies.id),
  plantName: text("plant_name").notNull(),
  fuelType: varchar("fuel_type", { length: 64 }),
  capacityMw: numeric("capacity_mw", { precision: 12, scale: 2 }),
  permitStatus: varchar("permit_status", { length: 64 }),
  location: pointGeometry("location"),
  activeYear: integer("active_year"),
  ...classificationColumns,
  ...sourceColumns,
  metadata: jsonb("metadata").$type<Record<string, unknown>>().default({}).notNull(),
  ...auditColumns,
});

export const hazardousSites = pgTable("hazardous_sites", {
  id: serial("id").primaryKey(),
  slug: varchar("slug", { length: 160 }).unique(),
  geographyId: integer("geography_id").references(() => geographies.id),
  siteName: text("site_name").notNull(),
  siteClass: varchar("site_class", { length: 64 }),
  status: varchar("status", { length: 64 }),
  boundary: geometry("boundary"),
  remediationYear: integer("remediation_year"),
  ...classificationColumns,
  ...sourceColumns,
  metadata: jsonb("metadata").$type<Record<string, unknown>>().default({}).notNull(),
  ...auditColumns,
});

export const pfasSites = pgTable("pfas_sites", {
  id: serial("id").primaryKey(),
  slug: varchar("slug", { length: 160 }).unique(),
  geographyId: integer("geography_id").references(() => geographies.id),
  siteName: text("site_name").notNull(),
  siteSubtype: varchar("site_subtype", { length: 64 }),
  samplingMatrix: varchar("sampling_matrix", { length: 64 }),
  concentrationPpt: numeric("concentration_ppt", { precision: 12, scale: 2 }),
  observedYear: integer("observed_year"),
  location: pointGeometry("location"),
  ...classificationColumns,
  ...sourceColumns,
  metadata: jsonb("metadata").$type<Record<string, unknown>>().default({}).notNull(),
  ...auditColumns,
});

export const wastewaterSites = pgTable("wastewater_sites", {
  id: serial("id").primaryKey(),
  slug: varchar("slug", { length: 160 }).unique(),
  geographyId: integer("geography_id").references(() => geographies.id),
  facilityName: text("facility_name").notNull(),
  permitId: varchar("permit_id", { length: 64 }),
  dischargeType: varchar("discharge_type", { length: 64 }),
  flowMgd: numeric("flow_mgd", { precision: 10, scale: 2 }),
  outfallLocation: pointGeometry("outfall_location"),
  observedYear: integer("observed_year"),
  ...classificationColumns,
  ...sourceColumns,
  metadata: jsonb("metadata").$type<Record<string, unknown>>().default({}).notNull(),
  ...auditColumns,
});

export const reproductiveIndicators = pgTable("reproductive_indicators", {
  id: serial("id").primaryKey(),
  slug: varchar("slug", { length: 160 }).unique(),
  geographyId: integer("geography_id").references(() => geographies.id),
  indicatorName: text("indicator_name").notNull(),
  indicatorYear: integer("indicator_year").notNull(),
  value: numeric("value", { precision: 12, scale: 4 }),
  unit: varchar("unit", { length: 64 }),
  ...classificationColumns,
  ...sourceColumns,
  metadata: jsonb("metadata").$type<Record<string, unknown>>().default({}).notNull(),
  ...auditColumns,
});

export const spermStudies = pgTable("sperm_studies", {
  id: serial("id").primaryKey(),
  slug: varchar("slug", { length: 160 }).unique(),
  geographyId: integer("geography_id").references(() => geographies.id),
  studyTitle: text("study_title").notNull(),
  publicationYear: integer("publication_year"),
  sampleSize: integer("sample_size"),
  methodologyNote: text("methodology_note"),
  outcomeSummary: text("outcome_summary"),
  location: pointGeometry("location"),
  ...classificationColumns,
  ...sourceColumns,
  metadata: jsonb("metadata").$type<Record<string, unknown>>().default({}).notNull(),
  ...auditColumns,
});

export const fertilityTrends = pgTable("fertility_trends", {
  id: serial("id").primaryKey(),
  geographyId: integer("geography_id").references(() => geographies.id),
  trendTitle: text("trend_title"),
  year: integer("year").notNull(),
  fertilityRate: numeric("fertility_rate", { precision: 12, scale: 4 }),
  ageBand: varchar("age_band", { length: 32 }),
  ...classificationColumns,
  ...sourceColumns,
  metadata: jsonb("metadata").$type<Record<string, unknown>>().default({}).notNull(),
  ...auditColumns,
});

export const infertilityPrevalence = pgTable("infertility_prevalence", {
  id: serial("id").primaryKey(),
  geographyId: integer("geography_id").references(() => geographies.id),
  prevalenceTitle: text("prevalence_title"),
  year: integer("year").notNull(),
  prevalencePct: numeric("prevalence_pct", { precision: 8, scale: 3 }),
  ...classificationColumns,
  ...sourceColumns,
  metadata: jsonb("metadata").$type<Record<string, unknown>>().default({}).notNull(),
  ...auditColumns,
});

export const sentinelSpeciesRecords = pgTable("sentinel_species_records", {
  id: serial("id").primaryKey(),
  slug: varchar("slug", { length: 160 }).unique(),
  geographyId: integer("geography_id").references(() => geographies.id),
  speciesName: text("species_name").notNull(),
  recordYear: integer("record_year").notNull(),
  abnormalityType: varchar("abnormality_type", { length: 140 }),
  severityScore: numeric("severity_score", { precision: 8, scale: 3 }),
  location: pointGeometry("location"),
  ...classificationColumns,
  ...sourceColumns,
  metadata: jsonb("metadata").$type<Record<string, unknown>>().default({}).notNull(),
  ...auditColumns,
});

export const healthConcernContext = pgTable("health_concern_context", {
  id: serial("id").primaryKey(),
  slug: varchar("slug", { length: 160 }).unique(),
  geographyId: integer("geography_id").references(() => geographies.id),
  title: text("title").notNull(),
  concernType: varchar("concern_type", { length: 120 }),
  narrative: text("narrative"),
  isVerified: boolean("is_verified").default(false),
  ...classificationColumns,
  ...sourceColumns,
  metadata: jsonb("metadata").$type<Record<string, unknown>>().default({}).notNull(),
  ...auditColumns,
});

export const caseStudies = pgTable("case_studies", {
  id: serial("id").primaryKey(),
  slug: varchar("slug", { length: 140 }).notNull().unique(),
  title: text("title").notNull(),
  subtitle: text("subtitle").notNull(),
  location: text("location").notNull(),
  region: text("region").notNull(),
  geographyId: integer("geography_id").references(() => geographies.id),
  coordinates: pointGeometry("coordinates"),
  dateRangeLabel: varchar("date_range_label", { length: 64 }),
  category: text("category").notNull(),
  layerGroup: layerGroupEnum("layer_group").default("legal").notNull(),
  confidenceLevel: confidenceLevelEnum("confidence_level").default("moderate").notNull(),
  summary: text("summary").notNull(),
  whyItMatters: text("why_it_matters").notNull(),
  methodologyNote: text("methodology_note").notNull(),
  heroEyebrow: text("hero_eyebrow"),
  heroImageHint: text("hero_image_hint"),
  evidenceMix: jsonb("evidence_mix").$type<string[]>().default([]).notNull(),
  keySignals: jsonb("key_signals").$type<string[]>().default([]).notNull(),
  keyFindings: jsonb("key_findings").$type<string[]>().default([]).notNull(),
  narrative: jsonb("narrative").$type<string[]>().default([]).notNull(),
  tags: jsonb("tags").$type<string[]>().default([]).notNull(),
  relatedEntityIds: jsonb("related_entity_ids").$type<string[]>().default([]).notNull(),
  ...sourceColumns,
  publishedAt: timestamp("published_at", { withTimezone: true }),
  ...auditColumns,
});

export const sourceRegistry = pgTable("source_registry", {
  id: serial("id").primaryKey(),
  slug: varchar("slug", { length: 140 }).notNull().unique(),
  name: text("name").notNull(),
  shortName: text("short_name").notNull(),
  sourceType: sourceTypeEnum("source_type").notNull(),
  lifecycle: sourceLifecycleEnum("lifecycle").notNull(),
  programTier: sourceProgramTierEnum("program_tier").notNull(),
  layerGroups: jsonb("layer_groups").$type<string[]>().default([]).notNull(),
  supportedEvidence: jsonb("supported_evidence").$type<string[]>().default([]).notNull(),
  geographicScope: text("geographic_scope").notNull(),
  geographicLevel: geographicLevelEnum("geographic_level").notNull(),
  spatialResolution: text("spatial_resolution").notNull(),
  updateCadence: updateCadenceEnum("update_cadence").notNull(),
  completenessTags: jsonb("completeness_tags").$type<string[]>().default([]).notNull(),
  description: text("description").notNull(),
  caveats: jsonb("caveats").$type<string[]>().default([]).notNull(),
  confidenceNote: text("confidence_note").notNull(),
  methodologicalUse: text("methodological_use").notNull(),
  originSite: text("origin_site"),
  upstreamDatasets: jsonb("upstream_datasets").$type<string[]>().default([]).notNull(),
  downloadability: varchar("downloadability", { length: 48 }),
  ingestionMethod: varchar("ingestion_method", { length: 48 }),
  externalUrl: text("external_url").notNull(),
  sourceUpdatedAt: timestamp("source_updated_at", { withTimezone: true }),
  ...auditColumns,
});

export const updateLog = pgTable("update_log", {
  id: serial("id").primaryKey(),
  runLabel: varchar("run_label", { length: 140 }).notNull(),
  layerGroup: layerGroupEnum("layer_group").notNull(),
  sourceSlug: varchar("source_slug", { length: 140 }),
  status: varchar("status", { length: 64 }).notNull(),
  recordsAffected: integer("records_affected").default(0),
  ingestionVersion: varchar("ingestion_version", { length: 64 }).default("v1_draft"),
  notes: text("notes"),
  metadata: jsonb("metadata").$type<Record<string, unknown>>().default({}).notNull(),
  startedAt: timestamp("started_at", { withTimezone: true }).defaultNow().notNull(),
  completedAt: timestamp("completed_at", { withTimezone: true }),
});
