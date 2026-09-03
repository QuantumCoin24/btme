create table public.identity_verifications (
  member_id uuid primary key
    references public.members(id)
    on delete cascade,

  status text not null default 'not_started'
    check (
      status in (
        'not_started',
        'pending',
        'verified',
        'failed',
        'needs_review'
      )
    ),

  provider text,
  provider_reference text,

  verified_at timestamptz,
  submitted_at timestamptz,

  failure_code text,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint identity_verifications_provider_length
    check (
      provider is null
      or char_length(provider) between 1 and 100
    ),

  constraint identity_verifications_provider_reference_length
    check (
      provider_reference is null
      or char_length(provider_reference) between 1 and 500
    ),

  constraint identity_verifications_failure_code_length
    check (
      failure_code is null
      or char_length(failure_code) between 1 and 100
    ),

  constraint identity_verifications_verified_state
    check (
      (
        status = 'verified'
        and verified_at is not null
      )
      or
      (
        status <> 'verified'
        and verified_at is null
      )
    )
);

create index identity_verifications_status_idx
  on public.identity_verifications(status);

alter table public.identity_verifications
  enable row level security;

create policy "Members can read own identity verification"
  on public.identity_verifications
  for select
  to authenticated
  using (
    member_id = auth.uid()
  );

revoke all
  on table public.identity_verifications
  from anon;

revoke insert, update, delete
  on table public.identity_verifications
  from authenticated;

grant select
  on table public.identity_verifications
  to authenticated;

comment on table public.identity_verifications is
  'Server-controlled BTME identity verification state. Authenticated clients may read only their own record and cannot award or modify verification status.';

comment on column public.identity_verifications.status is
  'Authoritative verification lifecycle controlled by trusted server-side verification infrastructure.';

comment on column public.identity_verifications.provider_reference is
  'Opaque external verification reference only. Identity documents and biometric media must not be stored in this table.';
