create unique index if not exists
safe_date_escalations_source_event_unique_idx
on public.safe_date_escalations(source_event_id)
where source_event_id is not null;
