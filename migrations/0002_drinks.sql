create table if not exists drinks (
  id          text primary key,
  user_id     text not null,
  name        text not null,
  flavor      text not null default '',
  status      text not null default 'drank',
  date        text,
  taste       real not null default 0,
  effect      real not null default 0,
  design      real not null default 0,
  value       real not null default 0,
  notes       text not null default '',
  volume      real not null default 0,
  caffeine    real not null default 0,
  sugar       real,
  price       real not null default 0,
  store       text not null default '',
  created_at  timestamptz not null default now()
);

create index if not exists drinks_user_id_idx on drinks (user_id);
create index if not exists drinks_user_date_idx on drinks (user_id, date);
