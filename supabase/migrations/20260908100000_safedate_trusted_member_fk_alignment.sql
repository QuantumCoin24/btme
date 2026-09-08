alter table public.safe_date_trusted_contacts
  drop constraint if exists safe_date_trusted_contacts_member_id_fkey;

alter table public.safe_date_trusted_contacts
  add constraint safe_date_trusted_contacts_member_id_fkey
  foreign key (member_id)
  references public.members(id)
  on delete cascade;


alter table public.safe_date_session_trusted_contacts
  drop constraint if exists safe_date_session_trusted_contacts_member_id_fkey;

alter table public.safe_date_session_trusted_contacts
  add constraint safe_date_session_trusted_contacts_member_id_fkey
  foreign key (member_id)
  references public.members(id)
  on delete cascade;


alter table public.safe_date_escalations
  drop constraint if exists safe_date_escalations_member_id_fkey;

alter table public.safe_date_escalations
  add constraint safe_date_escalations_member_id_fkey
  foreign key (member_id)
  references public.members(id)
  on delete cascade;


alter table public.safe_date_notification_outbox
  drop constraint if exists safe_date_notification_outbox_member_id_fkey;

alter table public.safe_date_notification_outbox
  add constraint safe_date_notification_outbox_member_id_fkey
  foreign key (member_id)
  references public.members(id)
  on delete cascade;
