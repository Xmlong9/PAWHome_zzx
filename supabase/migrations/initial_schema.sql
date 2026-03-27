create extension if not exists pgcrypto;

create table if not exists public.health_checks (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now()
);

