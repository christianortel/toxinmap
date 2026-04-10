ALTER TABLE "source_registry"
ADD COLUMN "origin_site" text;
--> statement-breakpoint
ALTER TABLE "source_registry"
ADD COLUMN "upstream_datasets" jsonb DEFAULT '[]'::jsonb NOT NULL;
--> statement-breakpoint
ALTER TABLE "source_registry"
ADD COLUMN "downloadability" varchar(48);
--> statement-breakpoint
ALTER TABLE "source_registry"
ADD COLUMN "ingestion_method" varchar(48);
