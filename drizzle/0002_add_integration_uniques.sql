-- Add uniqueness constraints for integrations and ingested items
CREATE UNIQUE INDEX IF NOT EXISTS "integrations_user_provider_unique"
  ON "integrations" ("user_id", "provider");

CREATE UNIQUE INDEX IF NOT EXISTS "ingested_items_integration_source_unique"
  ON "ingested_items" ("integration_id", "source_id");
