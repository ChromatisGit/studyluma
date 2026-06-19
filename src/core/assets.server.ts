import { getRuntimeEnvVar } from "@chromatis/base/runtime";
import { anonSQL } from "@core/db.server";

export type AssetResult = { bytes: Uint8Array; contentType: string };

const CONTENT_TYPE_BY_EXT: Record<string, string> = {
  svg: "image/svg+xml",
  png: "image/png",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  gif: "image/gif",
  webp: "image/webp",
  pdf: "application/pdf",
};

/**
 * Resolves a content-addressed asset key ("<sha256>.<ext>", produced by the
 * studyluma-content pipeline) to its bytes. Backend is picked via ASSET_DRIVER
 * (defaults to "postgres") - see docs/CONTENT_PIPELINE.md.
 */
export async function getAsset(key: string): Promise<AssetResult | null> {
  const driver = getRuntimeEnvVar("ASSET_DRIVER") ?? "postgres";
  return driver === "s3" ? getAssetFromS3(key) : getAssetFromPostgres(key);
}

async function getAssetFromPostgres(key: string): Promise<AssetResult | null> {
  const rows = await anonSQL<{ content_type: string; bytes: Uint8Array }[]>`
    SELECT content_type, bytes FROM content_assets WHERE asset_key = ${key}
  `;

  const row = rows[0];
  return row ? { bytes: row.bytes, contentType: row.content_type } : null;
}

let s3Client: InstanceType<typeof Bun.S3Client> | null = null;

function getS3Client(): InstanceType<typeof Bun.S3Client> {
  const region = getRuntimeEnvVar("ASSET_S3_REGION");

  return (s3Client ??= new Bun.S3Client({
    endpoint: requireEnv("ASSET_S3_ENDPOINT"),
    bucket: requireEnv("ASSET_S3_BUCKET"),
    accessKeyId: requireEnv("ASSET_S3_ACCESS_KEY_ID"),
    secretAccessKey: requireEnv("ASSET_S3_SECRET_ACCESS_KEY"),
    ...(region ? { region } : {}),
  }));
}

function requireEnv(key: string): string {
  const value = getRuntimeEnvVar(key);
  if (!value) throw new Error(`Missing required env var: ${key} (ASSET_DRIVER=s3)`);
  return value;
}

async function getAssetFromS3(key: string): Promise<AssetResult | null> {
  const file = getS3Client().file(key);
  if (!(await file.exists())) return null;

  const ext = key.split(".").pop()?.toLowerCase() ?? "";
  return {
    bytes: new Uint8Array(await file.arrayBuffer()),
    contentType: CONTENT_TYPE_BY_EXT[ext] ?? "application/octet-stream",
  };
}
