-- BTME Production
-- Migration 0002
-- Harden authenticated client write boundaries.
--
-- Row Level Security continues to determine WHICH rows an authenticated
-- member may access. These grants additionally determine WHICH columns
-- an authenticated client may supply or mutate.
--
-- Server-controlled workflow/moderation columns intentionally remain
-- unavailable to the authenticated client role.

revoke insert, update
on table public.profile_photos
from authenticated;

grant insert
  (member_id, storage_path, position, is_hero)
on table public.profile_photos
to authenticated;

grant update
  (storage_path, position, is_hero)
on table public.profile_photos
to authenticated;


revoke insert, update
on table public.date_plans
from authenticated;

grant insert
  (connection_id, created_by, scheduled_for, place_name)
on table public.date_plans
to authenticated;

grant update
  (scheduled_for, place_name)
on table public.date_plans
to authenticated;


revoke insert
on table public.member_reports
from authenticated;

grant insert
  (reporter_id, reported_id, category, details)
on table public.member_reports
to authenticated;


revoke insert
on table public.messages
from authenticated;

grant insert
  (conversation_id, sender_id, body)
on table public.messages
to authenticated;


revoke insert, update
on table public.member_decisions
from authenticated;

grant insert
  (actor_id, target_id, decision)
on table public.member_decisions
to authenticated;

grant update
  (decision)
on table public.member_decisions
to authenticated;


revoke insert
on table public.member_blocks
from authenticated;

grant insert
  (blocker_id, blocked_id)
on table public.member_blocks
to authenticated;


revoke update
on table public.profiles
from authenticated;

grant update
  (first_name, birth_date, city, bio, profile_complete)
on table public.profiles
to authenticated;


revoke update
on table public.member_preferences
from authenticated;

grant update
  (
    relationship_intent,
    looking_for,
    minimum_age,
    maximum_age,
    distance_km
  )
on table public.member_preferences
to authenticated;


revoke update
on table public.compatibility_profiles
from authenticated;

grant update
  (
    lifestyle_signals,
    perfect_sunday,
    green_flag,
    absolute_no,
    chemistry_style,
    deal_breakers
  )
on table public.compatibility_profiles
to authenticated;
