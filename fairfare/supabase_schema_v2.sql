-- ============================================================
-- FairFare Schema ADDITIONS (v2)
-- Run this in Supabase SQL Editor AFTER the original schema
-- ============================================================

-- Add photo_urls column to posts
ALTER TABLE posts ADD COLUMN IF NOT EXISTS photo_urls TEXT[] DEFAULT '{}';

-- Flags table for moderation
CREATE TABLE IF NOT EXISTS flags (
  id          BIGSERIAL PRIMARY KEY,
  post_id     BIGINT REFERENCES posts(id) ON DELETE CASCADE,
  reason      TEXT NOT NULL CHECK (reason IN ('spam', 'fake', 'inappropriate', 'other')),
  details     TEXT,
  reporter_ip TEXT,
  resolved    BOOLEAN DEFAULT FALSE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE flags ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can flag a post"
  ON flags FOR INSERT WITH CHECK (true);

CREATE POLICY "Flags are readable with service role only"
  ON flags FOR SELECT USING (false);

-- Email subscribers for weekly digest
CREATE TABLE IF NOT EXISTS digest_subscribers (
  id         BIGSERIAL PRIMARY KEY,
  email      TEXT UNIQUE NOT NULL,
  active     BOOLEAN DEFAULT TRUE,
  token      TEXT UNIQUE NOT NULL DEFAULT gen_random_uuid()::text,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE digest_subscribers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can subscribe"
  ON digest_subscribers FOR INSERT WITH CHECK (true);

CREATE POLICY "Subscribers only readable by service role"
  ON digest_subscribers FOR SELECT USING (false);

-- Update posts view to include flag count (for admin)
CREATE OR REPLACE VIEW posts_with_flags AS
  SELECT p.*, COUNT(f.id) AS flag_count
  FROM posts p
  LEFT JOIN flags f ON f.post_id = p.id AND f.resolved = FALSE
  GROUP BY p.id;

-- Increment votes function (if not already created)
CREATE OR REPLACE FUNCTION increment_votes(post_id BIGINT)
RETURNS void AS $$
  UPDATE posts SET votes = votes + 1 WHERE id = post_id;
$$ LANGUAGE sql;

-- Storage bucket for post photos (run this too)
-- In Supabase Dashboard → Storage → New Bucket → name: "post-photos" → Public: YES
-- Then add this policy in Storage → post-photos → Policies:
--   Policy name: "Anyone can upload"
--   Allowed operations: INSERT
--   Policy definition: true

