import { z } from "@chromatis/base/config";
import type { SecretDefinition } from "@chromatis/base/secrets";
import { readSecret, type SecretSource } from "@chromatis/base/secrets";

const postgresUrl = z.string().url().startsWith("postgres");
const nonempty = z.string().min(1);

export const databaseUrlSecret = {
  name: "DATABASE_URL",
  owner: "website",
  description: "PostgreSQL runtime connection",
  required: true,
  schema: postgresUrl,
} satisfies SecretDefinition;

export const migrationUrlSecret = {
  name: "DATABASE_MIGRATION_URL",
  owner: "website",
  description: "PostgreSQL migration connection for local and test",
  required: true,
  schema: postgresUrl,
} satisfies SecretDefinition;

export const adminUrlSecret = {
  name: "DATABASE_ADMIN_URL",
  owner: "website setup",
  description: "Local PostgreSQL administrator connection",
  required: true,
  schema: postgresUrl,
} satisfies SecretDefinition;

export const publishTokenSecret = {
  name: "PUBLISH_TOKEN",
  owner: "website publishing",
  description: "Bearer token for content publishing",
  required: false,
  schema: nonempty,
} satisfies SecretDefinition;

export const adminPinSecret = {
  name: "SEED_ADMIN_PIN",
  owner: "website setup",
  description: "Local teacher PIN",
  required: true,
  schema: nonempty,
} satisfies SecretDefinition;

export const studentPinSecret = {
  name: "SEED_STUDENT_PIN",
  owner: "website setup",
  description: "Local student PIN",
  required: true,
  schema: nonempty,
} satisfies SecretDefinition;

export const outsiderPinSecret = {
  name: "SEED_OUTSIDER_PIN",
  owner: "website setup",
  description: "Local outsider PIN",
  required: false,
  schema: nonempty,
} satisfies SecretDefinition;

export function requireWebsiteSecret(definition: SecretDefinition, source: SecretSource): string {
  const value = readSecret(definition, source);
  if (value === undefined) {
    throw new Error(`${definition.name} is required`);
  }
  return value;
}
