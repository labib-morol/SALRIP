-- Case coordination workflow: cases + immutable audit trail of status changes.

create type case_status as enum ('Open', 'Assigned', 'Acknowledged', 'Escalated', 'Resolved');

create table if not exists public.cases (
  id              uuid primary key default gen_random_uuid(),
  alert_type      text not null,
  agent_id        text not null,
  provider        text not null,
  severity        text not null,
  status          case_status not null default 'Open',
  assigned_to     text,
  evidence        jsonb not null default '{}'::jsonb,
  window_start    timestamptz not null,
  window_end      timestamptz not null,
  sla_due_at      timestamptz,
  resolution_note text,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  resolved_at     timestamptz
);

create index if not exists cases_status_idx  on public.cases (status);
create index if not exists cases_agent_idx   on public.cases (agent_id);
create index if not exists cases_created_idx on public.cases (created_at desc);

create table if not exists public.case_events (
  id          uuid primary key default gen_random_uuid(),
  case_id     uuid not null references public.cases (id) on delete cascade,
  from_status case_status,
  to_status   case_status not null,
  actor       text,
  note        text,
  created_at  timestamptz not null default now()
);

create index if not exists case_events_case_idx on public.case_events (case_id, created_at);

-- keep updated_at fresh on every row update
create or replace function public.set_updated_at()
returns trigger language plpgsql
set search_path = '' as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger cases_set_updated_at
  before update on public.cases
  for each row execute function public.set_updated_at();

-- RLS locked down: the /api/cases route handlers use the service-role key
-- (which bypasses RLS), so no anon/authenticated policies are granted. Direct
-- client access is denied by default.
alter table public.cases       enable row level security;
alter table public.case_events enable row level security;
