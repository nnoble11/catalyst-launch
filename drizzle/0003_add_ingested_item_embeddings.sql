CREATE EXTENSION IF NOT EXISTS vector;

CREATE TABLE IF NOT EXISTS "ingested_item_embeddings" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "ingested_item_id" uuid NOT NULL,
  "user_id" uuid NOT NULL,
  "provider" "integration_provider" NOT NULL,
  "item_type" "ingest_item_type" NOT NULL,
  "content_hash" text NOT NULL,
  "status" varchar(20) DEFAULT 'pending' NOT NULL,
  "error_count" integer DEFAULT 0 NOT NULL,
  "last_error" text,
  "embedding" vector(1536),
  "created_at" timestamptz DEFAULT now() NOT NULL,
  "updated_at" timestamptz DEFAULT now() NOT NULL
);

DO $$ BEGIN
  ALTER TABLE "ingested_item_embeddings"
    ADD CONSTRAINT "ingested_item_embeddings_ingested_item_id_fk"
    FOREIGN KEY ("ingested_item_id") REFERENCES "public"."ingested_items"("id")
    ON DELETE cascade ON UPDATE no action;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  ALTER TABLE "ingested_item_embeddings"
    ADD CONSTRAINT "ingested_item_embeddings_user_id_fk"
    FOREIGN KEY ("user_id") REFERENCES "public"."users"("id")
    ON DELETE cascade ON UPDATE no action;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS "ingested_item_embeddings_ingested_item_unique"
  ON "ingested_item_embeddings" ("ingested_item_id");

CREATE INDEX IF NOT EXISTS "ingested_item_embeddings_user_idx"
  ON "ingested_item_embeddings" ("user_id");

CREATE INDEX IF NOT EXISTS "ingested_item_embeddings_provider_idx"
  ON "ingested_item_embeddings" ("provider");

CREATE INDEX IF NOT EXISTS "ingested_item_embeddings_vector_idx"
  ON "ingested_item_embeddings"
  USING ivfflat ("embedding" vector_cosine_ops) WITH (lists = 100);
