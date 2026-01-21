-- Add missing integration provider enum values
ALTER TYPE "integration_provider" ADD VALUE IF NOT EXISTS 'github';
ALTER TYPE "integration_provider" ADD VALUE IF NOT EXISTS 'stripe';
ALTER TYPE "integration_provider" ADD VALUE IF NOT EXISTS 'google_sheets';
ALTER TYPE "integration_provider" ADD VALUE IF NOT EXISTS 'mixpanel';
ALTER TYPE "integration_provider" ADD VALUE IF NOT EXISTS 'posthog';
ALTER TYPE "integration_provider" ADD VALUE IF NOT EXISTS 'amplitude';
