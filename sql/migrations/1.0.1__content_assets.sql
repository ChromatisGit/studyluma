-- ============================================================
-- StudyLuma — content_assets (Postgres-backed asset storage)
-- ============================================================
--
-- Binary assets (currently: images) referenced from content_pages. Content-addressed:
-- asset_key is "<sha256-of-bytes>.<ext>", so writes are naturally idempotent and the
-- asset is immutable once written. Only used when the content pipeline is configured
-- with asset_driver: postgres (the default) - see docs/CONTENT_PIPELINE.md. With
-- asset_driver: s3, assets live in S3-compatible storage instead and this table stays
-- empty. No RLS, same as content_pages - access control happens at the course level,
-- not per asset (see docs/ARCHITECTURE.md).

CREATE TABLE IF NOT EXISTS content_assets (
  asset_key     TEXT PRIMARY KEY,
  content_type  TEXT NOT NULL,
  bytes         BYTEA NOT NULL,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
