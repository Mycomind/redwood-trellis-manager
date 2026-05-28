create extension if not exists "pgcrypto";

create table if not exists products (
  id text primary key,
  name text not null,
  dimensions text not null,
  stock_type text not null check (stock_type in ('3/4"', '1 1/8"')),
  thickness_inches numeric(6, 3) not null,
  slat_width_inches numeric(6, 3) not null,
  width_feet numeric(8, 2) not null,
  height_feet numeric(8, 2) not null,
  vertical_slat_count integer not null,
  horizontal_slat_count integer not null,
  diagonal_brace_count integer not null default 0,
  estimated_labor_minutes integer not null,
  retail_price numeric(10, 2) not null,
  wholesale_price numeric(10, 2) not null,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists lumber_batches (
  id uuid primary key default gen_random_uuid(),
  supplier_name text not null,
  wood_type text not null,
  unit_cost numeric(10, 2) not null,
  nominal_board_feet numeric(10, 2) not null,
  fuel_travel_cost numeric(10, 2) not null default 0,
  estimated_usable_percentage numeric(5, 2) not null,
  actual_usable_board_feet numeric(10, 2),
  notes text not null default '',
  created_at timestamptz not null default now(),
  total_landed_cost numeric(10, 2) generated always as ((unit_cost * nominal_board_feet) + fuel_travel_cost) stored,
  effective_cost_per_usable_board_foot numeric(10, 2) generated always as (
    ((unit_cost * nominal_board_feet) + fuel_travel_cost) /
    nullif(coalesce(actual_usable_board_feet, nominal_board_feet * estimated_usable_percentage / 100), 0)
  ) stored
);

create table if not exists quotes (
  id uuid primary key default gen_random_uuid(),
  customer_name text not null,
  phone text,
  email text,
  product_id text references products(id),
  quantity integer not null default 1,
  custom_dimensions text not null default '',
  calculated_cost numeric(10, 2) not null default 0,
  quoted_price numeric(10, 2) not null default 0,
  deposit_amount numeric(10, 2) not null default 0,
  notes text not null default '',
  valid_until date,
  status text not null default 'draft' check (status in ('draft', 'sent', 'accepted', 'declined')),
  created_at timestamptz not null default now()
);

create table if not exists jobs (
  id uuid primary key default gen_random_uuid(),
  customer_name text not null,
  product_id text references products(id),
  quote_id uuid references quotes(id),
  status text not null default 'new' check (status in ('new', 'quoted', 'deposit paid', 'building', 'ready', 'delivered', 'paid')),
  due_date date,
  balance_owed numeric(10, 2) not null default 0,
  notes text not null default '',
  created_at timestamptz not null default now()
);

create table if not exists shop_settings (
  id text primary key default 'default',
  default_board_foot_cost numeric(10, 2) not null default 7.10,
  default_waste_percentage numeric(5, 2) not null default 18,
  default_hardware_cost numeric(10, 2) not null default 3.50,
  default_hourly_labor_rate numeric(10, 2) not null default 38,
  default_markup_percentage numeric(5, 2) not null default 85,
  default_wholesale_discount_percentage numeric(5, 2) not null default 28,
  updated_at timestamptz not null default now()
);

alter table products enable row level security;
alter table lumber_batches enable row level security;
alter table quotes enable row level security;
alter table jobs enable row level security;
alter table shop_settings enable row level security;

create policy "Allow app users to manage products" on products for all to anon, authenticated using (true) with check (true);
create policy "Allow app users to manage lumber batches" on lumber_batches for all to anon, authenticated using (true) with check (true);
create policy "Allow app users to manage quotes" on quotes for all to anon, authenticated using (true) with check (true);
create policy "Allow app users to manage jobs" on jobs for all to anon, authenticated using (true) with check (true);
create policy "Allow app users to manage shop settings" on shop_settings for all to anon, authenticated using (true) with check (true);

insert into shop_settings (
  id,
  default_board_foot_cost,
  default_waste_percentage,
  default_hardware_cost,
  default_hourly_labor_rate,
  default_markup_percentage,
  default_wholesale_discount_percentage
) values (
  'default',
  7.10,
  18,
  3.50,
  38,
  85,
  28
) on conflict (id) do nothing;

insert into products (
  id, name, dimensions, stock_type, thickness_inches, slat_width_inches, width_feet, height_feet,
  vertical_slat_count, horizontal_slat_count, diagonal_brace_count, estimated_labor_minutes,
  retail_price, wholesale_price, active
) values
  ('og-2x2', '3/4" Open Grid Trellis 2'' x 2''', '2'' x 2''', '3/4"', 0.75, 1.25, 2, 2, 3, 4, 1, 28, 32, 23, true),
  ('og-3x2', '3/4" Open Grid Trellis 3'' x 2''', '3'' x 2''', '3/4"', 0.75, 1.25, 3, 2, 4, 4, 1, 34, 38, 27, true),
  ('og-4x2', '3/4" Open Grid Trellis 4'' x 2''', '4'' x 2''', '3/4"', 0.75, 1.25, 4, 2, 5, 4, 1, 39, 48, 35, true),
  ('og-5x2', '3/4" Open Grid Trellis 5'' x 2''', '5'' x 2''', '3/4"', 0.75, 1.25, 5, 2, 6, 4, 1, 44, 58, 42, true),
  ('og-6x2', '3/4" Open Grid Trellis 6'' x 2''', '6'' x 2''', '3/4"', 0.75, 1.25, 6, 2, 7, 4, 1, 49, 68, 49, true),
  ('og-4x3', '3/4" Open Grid Trellis 4'' x 3''', '4'' x 3''', '3/4"', 0.75, 1.25, 4, 3, 5, 5, 1, 49, 78, 56, true),
  ('og-5x3', '3/4" Open Grid Trellis 5'' x 3''', '5'' x 3''', '3/4"', 0.75, 1.25, 5, 3, 6, 5, 1, 57, 92, 66, true),
  ('og-4x4', '3/4" Open Grid Trellis 4'' x 4''', '4'' x 4''', '3/4"', 0.75, 1.25, 4, 4, 5, 6, 1, 60, 110, 79, true),
  ('og-5x4', '3/4" Open Grid Trellis 5'' x 4''', '5'' x 4''', '3/4"', 0.75, 1.25, 5, 4, 6, 6, 1, 70, 128, 92, true),
  ('og-6x4', '3/4" Open Grid Trellis 6'' x 4''', '6'' x 4''', '3/4"', 0.75, 1.25, 6, 4, 7, 6, 1, 80, 168, 121, true),
  ('pr-4x2', '1 1/8" Premium Trellis 4'' x 2''', '4'' x 2''', '1 1/8"', 1.125, 1.5, 4, 2, 5, 4, 2, 45, 68, 49, true),
  ('pr-5x2', '1 1/8" Premium Trellis 5'' x 2''', '5'' x 2''', '1 1/8"', 1.125, 1.5, 5, 2, 6, 4, 2, 52, 78, 56, true),
  ('pr-6x2', '1 1/8" Premium Trellis 6'' x 2''', '6'' x 2''', '1 1/8"', 1.125, 1.5, 6, 2, 7, 4, 2, 59, 92, 66, true),
  ('pr-4x3', '1 1/8" Premium Trellis 4'' x 3''', '4'' x 3''', '1 1/8"', 1.125, 1.5, 4, 3, 5, 5, 2, 59, 118, 85, true),
  ('pr-5x3', '1 1/8" Premium Trellis 5'' x 3''', '5'' x 3''', '1 1/8"', 1.125, 1.5, 5, 3, 6, 5, 2, 69, 138, 99, true),
  ('pr-6x3', '1 1/8" Premium Trellis 6'' x 3''', '6'' x 3''', '1 1/8"', 1.125, 1.5, 6, 3, 7, 5, 2, 79, 158, 114, true),
  ('pr-4x4', '1 1/8" Premium Trellis 4'' x 4''', '4'' x 4''', '1 1/8"', 1.125, 1.5, 4, 4, 5, 6, 2, 72, 188, 135, true),
  ('pr-5x4', '1 1/8" Premium Trellis 5'' x 4''', '5'' x 4''', '1 1/8"', 1.125, 1.5, 5, 4, 6, 6, 2, 86, 218, 157, true),
  ('pr-6x4', '1 1/8" Premium Trellis 6'' x 4''', '6'' x 4''', '1 1/8"', 1.125, 1.5, 6, 4, 7, 6, 2, 100, 278, 200, true)
on conflict (id) do update set
  retail_price = excluded.retail_price,
  wholesale_price = excluded.wholesale_price,
  active = excluded.active;
