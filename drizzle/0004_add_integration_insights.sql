CREATE TABLE IF NOT EXISTS "integration_insights" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "user_id" uuid NOT NULL,
  "project_id" uuid,
  "summary" text NOT NULL,
  "insights" jsonb DEFAULT '[]'::jsonb,
  "recommendations" jsonb DEFAULT '[]'::jsonb,
  "next_steps" jsonb DEFAULT '[]'::jsonb,
  "window_days" integer DEFAULT 7 NOT NULL,
  "generated_at" timestamptz DEFAULT now() NOT NULL,
  "created_at" timestamptz DEFAULT now() NOT NULL
);

DO $$ BEGIN
  ALTER TABLE "integration_insights"
    ADD CONSTRAINT "integration_insights_user_id_fk"
    FOREIGN KEY ("user_id") REFERENCES "public"."users"("id")
    ON DELETE cascade ON UPDATE no action;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  ALTER TABLE "integration_insights"
    ADD CONSTRAINT "integration_insights_project_id_fk"
    FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id")
    ON DELETE set null ON UPDATE no action;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

CREATE INDEX IF NOT EXISTS "integration_insights_user_idx"
  ON "integration_insights" ("user_id");

CREATE INDEX IF NOT EXISTS "integration_insights_project_idx"
  ON "integration_insights" ("project_id");
