-- ============================================================================
-- Notification system — email opt-outs + scheduled digests
-- ============================================================================

-- Members who have unsubscribed from the weekly community digest.
-- Transactional emails (direct messages, account/session emails) are NOT
-- gated by this table — only the marketing-style weekly digest is.
create table if not exists public.email_opt_outs (
  email       text primary key,
  created_at  timestamptz not null default now()
);

alter table public.email_opt_outs enable row level security;

-- No public policies: only the service role (used by edge functions) touches
-- this table. RLS-on with no policy = locked to service role. Nothing to add.

-- ----------------------------------------------------------------------------
-- Community engagement persistence (likes + replies)
-- ----------------------------------------------------------------------------
-- The portal has always called community-post with like/unlike/reply actions,
-- but the function didn't handle them, so likes and replies were never saved
-- (they vanished on refresh). The function now persists them into these
-- columns. `liked_by` holds member emails (likes = its length); `replies`
-- holds reply objects, each with a server-set created_at so digests can
-- count them per day / per week.
alter table public.community_posts add column if not exists liked_by jsonb not null default '[]'::jsonb;
alter table public.community_posts add column if not exists replies  jsonb not null default '[]'::jsonb;

-- ============================================================================
-- SCHEDULING THE DIGESTS  (run manually — see notes; not auto-applied)
-- ============================================================================
-- The `digests` edge function sends bulk email, so it is guarded by a shared
-- secret. Do NOT hard-code that secret in a committed migration. Set it up one
-- of these two ways after deploying the function:
--
-- 1) Set the function secret:   supabase secrets set DIGEST_SECRET=<random-value>
--    (also set UNSUB_SECRET=<another-random-value> for signed unsubscribe links)
--
-- 2a) EASIEST — Supabase Dashboard → Integrations → Cron → Create job:
--     • Weekly member digest:  Sunday 13:00 UTC (~9am ET)   →  cron: 0 13 * * 0
--       POST https://eytysuurxsfsbimgpion.supabase.co/functions/v1/digests
--       body: { "kind": "community_weekly", "secret": "<DIGEST_SECRET>" }
--     • Jess daily community digest:  daily 23:00 UTC (~7pm ET) → cron: 0 23 * * *
--       POST https://eytysuurxsfsbimgpion.supabase.co/functions/v1/digests
--       body: { "kind": "jess_daily", "secret": "<DIGEST_SECRET>" }
--
-- 2b) OR via pg_cron in the SQL editor (replace <DIGEST_SECRET> with your value):
--
--   create extension if not exists pg_cron;
--   create extension if not exists pg_net;
--
--   select cron.schedule('sjtn-weekly-digest', '0 13 * * 0', $$
--     select net.http_post(
--       url     := 'https://eytysuurxsfsbimgpion.supabase.co/functions/v1/digests',
--       headers := '{"Content-Type":"application/json"}'::jsonb,
--       body    := '{"kind":"community_weekly","secret":"<DIGEST_SECRET>"}'::jsonb
--     );
--   $$);
--
--   select cron.schedule('sjtn-jess-daily-digest', '0 23 * * *', $$
--     select net.http_post(
--       url     := 'https://eytysuurxsfsbimgpion.supabase.co/functions/v1/digests',
--       headers := '{"Content-Type":"application/json"}'::jsonb,
--       body    := '{"kind":"jess_daily","secret":"<DIGEST_SECRET>"}'::jsonb
--     );
--   $$);
--
-- To remove a job:  select cron.unschedule('sjtn-weekly-digest');
-- ============================================================================
