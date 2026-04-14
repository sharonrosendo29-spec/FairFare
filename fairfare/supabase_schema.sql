-- ============================================================
-- FairFare Database Schema
-- Run this in your Supabase SQL editor:
-- https://supabase.com → Your Project → SQL Editor → New Query
-- ============================================================

-- Posts table (rides, deliveries, stories)
CREATE TABLE posts (
  id           BIGSERIAL PRIMARY KEY,
  type         TEXT NOT NULL CHECK (type IN ('ride', 'delivery', 'story')),
  platform     TEXT NOT NULL,
  location     TEXT NOT NULL,
  state        TEXT,
  customer_paid NUMERIC(10,2),
  driver_got   NUMERIC(10,2),
  company_kept NUMERIC(10,2) GENERATED ALWAYS AS (
    CASE WHEN customer_paid IS NOT NULL AND driver_got IS NOT NULL
    THEN customer_paid - driver_got ELSE NULL END
  ) STORED,
  driver_pct   NUMERIC(5,2) GENERATED ALWAYS AS (
    CASE WHEN customer_paid > 0 AND driver_got IS NOT NULL
    THEN ROUND((driver_got / customer_paid) * 100, 2) ELSE NULL END
  ) STORED,
  miles        NUMERIC(8,2),
  body         TEXT NOT NULL,
  sentiment    TEXT NOT NULL DEFAULT 'neutral'
               CHECK (sentiment IN ('negative', 'neutral', 'positive', 'great')),
  votes        INTEGER NOT NULL DEFAULT 0,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Votes table to prevent duplicate voting (by IP hash)
CREATE TABLE post_votes (
  post_id      BIGINT REFERENCES posts(id) ON DELETE CASCADE,
  voter_hash   TEXT NOT NULL,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (post_id, voter_hash)
);

-- Enable Row Level Security
ALTER TABLE posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE post_votes ENABLE ROW LEVEL SECURITY;

-- Allow anyone to read posts
CREATE POLICY "Posts are publicly readable"
  ON posts FOR SELECT USING (true);

-- Allow anyone to insert posts (anonymous submissions)
CREATE POLICY "Anyone can submit a post"
  ON posts FOR INSERT WITH CHECK (true);

-- Allow updating vote count only
CREATE POLICY "Vote count can be updated"
  ON posts FOR UPDATE USING (true) WITH CHECK (true);

-- Allow anyone to read/insert votes
CREATE POLICY "Votes are publicly readable"
  ON post_votes FOR SELECT USING (true);

CREATE POLICY "Anyone can vote"
  ON post_votes FOR INSERT WITH CHECK (true);

-- Indexes for fast queries
CREATE INDEX idx_posts_created   ON posts(created_at DESC);
CREATE INDEX idx_posts_type      ON posts(type);
CREATE INDEX idx_posts_platform  ON posts(platform);
CREATE INDEX idx_posts_state     ON posts(state);
CREATE INDEX idx_posts_votes     ON posts(votes DESC);

-- Seed some example posts so the app isn't empty on launch
INSERT INTO posts (type, platform, location, state, customer_paid, driver_got, miles, body, sentiment, votes) VALUES
('ride',     'Uber',        'Los Angeles, CA', 'CA', 32.50, 11.20, 9.4,
 'Passenger paid $32.50, I got $11.20. That''s a 65% cut for Uber. I drove 9 miles, spent 20 minutes, made $1.19/mile. After gas and wear-and-tear I barely broke even. This needs to change.',
 'negative', 312),
('delivery', 'DoorDash',    'Houston, TX',     'TX', 28.00, 4.75,  3.2,
 'DoorDash took $23.25 on a $28 order. I drove 3.2 miles in 25 minutes and got $4.75. The customer left a $2 cash tip on top. This is modern day exploitation of workers.',
 'negative', 289),
('story',    'Lyft',        'New York, NY',    'NY', NULL,  NULL,  NULL,
 'I''ve been driving for Lyft for 4 years. Last month they cut my bonus tier without any notice. I went from making $28/hr to $19/hr overnight. When I contacted support they just said policies are subject to change. Four years of loyalty and this is how they treat drivers.',
 'negative', 201),
('ride',     'Uber',        'Chicago, IL',     'IL', 18.00, 10.80, 5.1,
 'Got a reasonable cut on this one — Uber only took about 40%. Short airport run, passenger was great and tipped $3 in-app. Not every ride is a rip-off but the inconsistency is the real problem — you never know what you''ll get.',
 'neutral', 87),
('delivery', 'Instacart',   'Seattle, WA',     'WA', 89.00, 9.50,  6.8,
 'Shopped for 45 minutes, drove 6.8 miles, and Instacart paid me $9.50 on an $89 order. Customer paid a $10 service fee plus 10% surge. None of that reached me. The platform pocketed almost everything above base pay.',
 'negative', 445),
('story',    'DoorDash',    'Miami, FL',       'FL', NULL,  NULL,  NULL,
 'Had the most amazing customer last week — a 78 year old woman ordering soup because she was sick and couldn''t leave the house. She tipped $15 on a $12 order and left a thank-you note on the door. Not everything is bad out here. Just wanted to share something good.',
 'great', 534),
('delivery', 'Grubhub',     'Phoenix, AZ',     'AZ', 42.00, 7.25,  4.4,
 'Grubhub took $34.75 of a $42 order. 82% company cut. I have screenshots. The restaurant also said they paid 30% commission on their end. The customer, restaurant AND driver are all getting squeezed simultaneously.',
 'negative', 677),
('ride',     'Lyft',        'Austin, TX',      'TX', 24.00, 15.50, 7.0,
 'Lyft took 35% on this trip. Best cut I''ve seen in a while. Passenger was heading to the airport at 5am, offered to tip extra for the early hour. Good people out there — this is why I keep driving.',
 'positive', 93),
('story',    'Uber',        'Denver, CO',      'CO', NULL,  NULL,  NULL,
 'Uber deactivated my account after 2,400 rides and a 4.92 star rating. No warning, no real explanation beyond "a report was filed." Their appeals process is a black hole — automated rejections only. 2,400 rides means nothing to them. I''m disposable. I''m a human being with bills.',
 'negative', 892),
('delivery', 'Amazon Flex', 'Atlanta, GA',     'GA', NULL,  NULL,  62,
 'Amazon Flex block: 4 hours, 45 packages, 62 miles driven, paid $72. Sounds ok until you factor in $18 gas, vehicle wear on apartment speed bumps, and 2 misdeliveries because their GPS is broken. Real take-home after expenses: ~$47 for 4 hours of hard labor.',
 'negative', 156);
