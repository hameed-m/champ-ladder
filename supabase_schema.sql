-- ==========================================================
-- سلّم الأبطال (Sullam Al-Abtal) — Supabase Production Schema
-- Run this entire script in the Supabase SQL Editor
-- ==========================================================

-- 1. Admins Table
CREATE TABLE IF NOT EXISTS public.sullam_admins (
  email TEXT PRIMARY KEY,
  password_hash TEXT NOT NULL,
  is_root BOOLEAN NOT NULL DEFAULT FALSE,
  created_by TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Seed Primary Root Admin (a.alhofufy@gmail.com)
INSERT INTO public.sullam_admins (email, password_hash, is_root, created_by)
VALUES (
  'a.alhofufy@gmail.com',
  '57972265854348ce50452cb2560b61c1b802cc116b8f1c0bbb8ba5a860570bcf',
  TRUE,
  'system'
)
ON CONFLICT (email) DO UPDATE
SET is_root = TRUE;

-- 2. Rooms Table (Per-Admin Permanent Named Rooms/Classes)
CREATE TABLE IF NOT EXISTS public.sullam_rooms (
  id TEXT PRIMARY KEY,
  admin_email TEXT NOT NULL REFERENCES public.sullam_admins(email) ON DELETE CASCADE,
  name TEXT NOT NULL,
  join_code TEXT,
  settings JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_sullam_rooms_admin ON public.sullam_rooms(admin_email);
CREATE INDEX IF NOT EXISTS idx_sullam_rooms_code ON public.sullam_rooms(join_code);

-- 3. Players Table (Per-Room Roster & Learning Reports)
CREATE TABLE IF NOT EXISTS public.sullam_players (
  id TEXT PRIMARY KEY,
  room_id TEXT NOT NULL REFERENCES public.sullam_rooms(id) ON DELETE CASCADE,
  admin_email TEXT NOT NULL REFERENCES public.sullam_admins(email) ON DELETE CASCADE,
  name TEXT NOT NULL,
  emoji TEXT NOT NULL DEFAULT '🦁',
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  level INT NOT NULL DEFAULT 1,
  topics JSONB NOT NULL DEFAULT '["mul"]'::jsonb,
  tables JSONB NOT NULL DEFAULT '[1,2,3,4,5,6,7,8,9]'::jsonb,
  games INT NOT NULL DEFAULT 0,
  wins INT NOT NULL DEFAULT 0,
  best INT NOT NULL DEFAULT 0,
  stats JSONB NOT NULL DEFAULT '{"t":{},"tb":{},"miss":{}}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_sullam_players_room ON public.sullam_players(room_id);
CREATE INDEX IF NOT EXISTS idx_sullam_players_admin ON public.sullam_players(admin_email);

-- 4. Matches Table (Match History & Analytics per Room)
CREATE TABLE IF NOT EXISTS public.sullam_matches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id TEXT REFERENCES public.sullam_rooms(id) ON DELETE SET NULL,
  room_name TEXT,
  admin_email TEXT NOT NULL,
  winner_name TEXT NOT NULL,
  board_size INT NOT NULL,
  mode TEXT NOT NULL,
  rankings JSONB NOT NULL DEFAULT '[]'::jsonb,
  played_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_sullam_matches_room ON public.sullam_matches(room_id);
CREATE INDEX IF NOT EXISTS idx_sullam_matches_admin ON public.sullam_matches(admin_email);

-- 5. Enable Row Level Security (RLS) & Policies for Client SDK / REST API
ALTER TABLE public.sullam_admins ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sullam_rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sullam_players ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sullam_matches ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'sullam_admins' AND policyname = 'Allow public access to sullam_admins') THEN
    CREATE POLICY "Allow public access to sullam_admins" ON public.sullam_admins FOR ALL USING (true) WITH CHECK (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'sullam_rooms' AND policyname = 'Allow public access to sullam_rooms') THEN
    CREATE POLICY "Allow public access to sullam_rooms" ON public.sullam_rooms FOR ALL USING (true) WITH CHECK (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'sullam_players' AND policyname = 'Allow public access to sullam_players') THEN
    CREATE POLICY "Allow public access to sullam_players" ON public.sullam_players FOR ALL USING (true) WITH CHECK (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'sullam_matches' AND policyname = 'Allow public access to sullam_matches') THEN
    CREATE POLICY "Allow public access to sullam_matches" ON public.sullam_matches FOR ALL USING (true) WITH CHECK (true);
  END IF;
END $$;
