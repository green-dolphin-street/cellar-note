create table if not exists public.wines (
  id text primary key,
  data jsonb not null default '{}'::jsonb,
  image_url text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.wines enable row level security;

revoke all on table public.wines from anon, authenticated;
grant select, insert, update, delete on table public.wines to service_role;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('wine-images', 'wine-images', true, 12582912, array['image/jpeg'])
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;
