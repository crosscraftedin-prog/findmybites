-- FindMyBites x PimpMyParty — Supabase PostgreSQL Schema
-- Run this once in Supabase Dashboard -> SQL Editor -> New Query -> Run

-- 1. Vendors (storefronts)
create table if not exists public.vendors (
  id text primary key,
  owner_id text not null,
  slug text not null unique,
  name text not null,
  marketplace text not null default 'food' check (marketplace in ('food', 'party')),
  category text not null,
  country text not null,
  state text not null default '',
  city text not null,
  area text not null default '',
  lat double precision not null default 0,
  lng double precision not null default 0,
  whatsapp_number text not null,
  plan_tier text not null default 'free' check (plan_tier in ('free', 'pro', 'business')),
  monthly_auto_pay boolean not null default false,
  price_tier text not null default '$$',
  starting_price_usd double precision not null default 0,
  rating double precision not null default 5.0,
  review_count integer not null default 0,
  response_time text not null default 'Replies within 15 mins on WhatsApp',
  verified boolean not null default false,
  status text not null default 'active' check (status in ('active', 'pending_review', 'paused')),
  tagline text not null default '',
  description text not null default '',
  promo_banner text,
  christmas_special boolean not null default false,
  christmas_offer text,
  bio_handle text,
  bio_theme text,
  instagram_handle text,
  custom_links jsonb not null default '[]'::jsonb,
  service_areas jsonb not null default '[]'::jsonb,
  all_states_coverage boolean not null default false,
  service_states jsonb not null default '[]'::jsonb,
  specialties jsonb not null default '[]'::jsonb,
  image text not null default '',
  logo text,
  gallery jsonb not null default '[]'::jsonb,
  products jsonb not null default '[]'::jsonb,
  custom_builder_enabled boolean not null default false,
  custom_builder_mode text check (custom_builder_mode in ('snackbox', 'mealbox', 'catering')),
  custom_builder_min_qty integer,
  custom_builder_packaging_usd double precision,
  claim_status text not null default 'none' check (claim_status in ('none', 'pending', 'claimed')),
  claimed_by_token text,
  seo_title text,
  seo_description text,
  seo_keywords text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_vendors_status on public.vendors(status);
create index if not exists idx_vendors_owner on public.vendors(owner_id);
create index if not exists idx_vendors_city on public.vendors(city);

-- 2. User profiles & saved shortlists
create table if not exists public.user_profiles (
  uid text primary key,
  display_name text not null,
  email text not null,
  saved_vendor_ids jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- 3. Bookings / enquiries
create table if not exists public.bookings (
  id text primary key,
  reference text not null,
  customer_id text not null,
  vendor_id text not null,
  vendor_owner_id text not null,
  vendor_name text not null,
  vendor_city text not null,
  vendor_category text not null,
  package_name text not null,
  estimated_usd double precision not null default 0,
  event_date text not null,
  guests integer not null default 10,
  customer_name text not null,
  customer_email text not null,
  notes text not null default '',
  status text not null default 'Confirmed Enquiry' check (
    status in ('Confirmed Enquiry', 'Awaiting Vendor Reply', 'Completed', 'Cancelled')
  ),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_bookings_customer on public.bookings(customer_id);
create index if not exists idx_bookings_vendor_owner on public.bookings(vendor_owner_id);

-- 4. Reviews
create table if not exists public.reviews (
  id text primary key,
  vendor_id text not null,
  author_id text not null,
  author_name text not null,
  event_type text not null,
  rating double precision not null check (rating >= 1 and rating <= 5),
  comment text not null,
  created_at timestamptz not null default now()
);

create index if not exists idx_reviews_vendor on public.reviews(vendor_id);

-- 5. Event requests & vendor quotes
create table if not exists public.event_requests (
  id text primary key,
  customer_id text not null,
  customer_name text not null,
  occasion text not null,
  categories jsonb not null default '[]'::jsonb,
  country text not null,
  state text not null,
  city text not null,
  event_date text not null,
  guests integer not null default 10,
  budget_usd double precision not null default 0,
  details text not null default '',
  status text not null default 'open' check (status in ('open', 'closed')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_event_requests_status on public.event_requests(status);
create index if not exists idx_event_requests_customer on public.event_requests(customer_id);

create table if not exists public.event_quotes (
  id text primary key,
  request_id text not null references public.event_requests(id) on delete cascade,
  request_customer_id text not null,
  vendor_owner_id text not null,
  vendor_id text not null,
  vendor_name text not null,
  vendor_slug text not null,
  vendor_whatsapp text not null,
  price_usd double precision not null,
  message text not null,
  created_at timestamptz not null default now()
);

create index if not exists idx_event_quotes_request on public.event_quotes(request_id);

-- 6. Vendor engagement metrics
create table if not exists public.vendor_metrics (
  vendor_id text primary key,
  views integer not null default 0,
  whatsapp_clicks integer not null default 0,
  shares integer not null default 0,
  updated_at timestamptz not null default now()
);

-- 7. Concierge store claims & admin transfer logs
create table if not exists public.store_claims (
  claim_id text primary key,
  vendor_id text not null,
  vendor_slug text not null,
  vendor_name text not null,
  phone_last4 text not null,
  status text not null default 'pending' check (status in ('pending', 'claimed', 'revoked')),
  created_by text not null,
  claimed_by text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.admin_transfers (
  vendor_id text primary key,
  vendor_name text not null,
  vendor_slug text not null,
  target_phone text not null,
  passcode text not null,
  claim_id text not null,
  status text not null default 'pending' check (status in ('pending', 'claimed', 'revoked')),
  created_by text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- 8. Global site settings
create table if not exists public.site_settings (
  id text primary key,
  site_title text not null,
  site_description text not null,
  site_keywords text not null default '',
  promo_enabled boolean not null default false,
  promo_text text not null default '',
  promo_cta_label text not null default '',
  snowfall_enabled boolean not null default true,
  require_vendor_approval boolean not null default false,
  updated_by text not null,
  updated_at timestamptz not null default now()
);

-- 9. Admin-managed Christmas Lunch & Dinner custom menu dishes
create table if not exists public.christmas_dishes (
  id text primary key,
  name text not null,
  category text not null,
  food_type text not null check (food_type in ('veg', 'non-veg')),
  price_inr_per_guest double precision not null,
  portion text not null,
  description text not null default '',
  image text,
  popular boolean not null default false,
  presets jsonb not null default '[]'::jsonb,
  active boolean not null default true,
  sort_order integer not null default 0,
  updated_by text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_christmas_dishes_active on public.christmas_dishes(active);

-- 10. Lock down direct anonymous access with RLS (all access goes through our verified server API)
alter table public.vendors enable row level security;
alter table public.user_profiles enable row level security;
alter table public.bookings enable row level security;
alter table public.reviews enable row level security;
alter table public.event_requests enable row level security;
alter table public.event_quotes enable row level security;
alter table public.vendor_metrics enable row level security;
alter table public.store_claims enable row level security;
alter table public.admin_transfers enable row level security;
alter table public.site_settings enable row level security;
alter table public.christmas_dishes enable row level security;

-- 11. Grant full access to server-side service_role (direct anon access remains locked by RLS)
grant usage on schema public to service_role;
grant all on all tables in schema public to service_role;
grant all on all sequences in schema public to service_role;

-- 12. Public Storage bucket for vendor covers, logos, product photos & Christmas dish images
insert into storage.buckets (id, name, public)
values ('marketplace-media', 'marketplace-media', true)
on conflict (id) do nothing;
