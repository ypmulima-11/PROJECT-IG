-- PostgreSQL target schema for Project IG.
-- Monetary values use integer TZS to avoid floating-point rounding.

CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TYPE router_vendor AS ENUM ('mikrotik', 'openwrt', 'generic_radius', 'omada');
CREATE TYPE session_state AS ENUM ('active', 'paused', 'disconnected', 'expired');
CREATE TYPE payment_channel AS ENUM ('mpesa', 'airtel_money', 'halopesa', 'yas', 'cash_voucher');
CREATE TYPE ledger_state AS ENUM ('verified', 'pending', 'reversed');

CREATE TABLE operators (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  display_name text NOT NULL,
  phone_e164 text NOT NULL UNIQUE,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE hotspot_locations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  operator_id uuid NOT NULL REFERENCES operators(id),
  name text NOT NULL,
  site_address text,
  timezone text NOT NULL DEFAULT 'Africa/Dar_es_Salaam',
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (operator_id, name)
);

CREATE TABLE routers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  location_id uuid NOT NULL REFERENCES hotspot_locations(id) ON DELETE CASCADE,
  name text NOT NULL,
  vendor router_vendor NOT NULL,
  model text NOT NULL,
  management_address inet,
  radius_nas_identifier text NOT NULL UNIQUE,
  is_enabled boolean NOT NULL DEFAULT true,
  last_seen_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (location_id, name)
);

CREATE TABLE subscription_plans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  location_id uuid NOT NULL REFERENCES hotspot_locations(id) ON DELETE CASCADE,
  name text NOT NULL,
  price_tzs bigint NOT NULL CHECK (price_tzs >= 0),
  duration_minutes integer NOT NULL CHECK (duration_minutes > 0),
  data_cap_mb bigint CHECK (data_cap_mb IS NULL OR data_cap_mb > 0),
  bandwidth_down_kbps integer CHECK (bandwidth_down_kbps IS NULL OR bandwidth_down_kbps > 0),
  bandwidth_up_kbps integer CHECK (bandwidth_up_kbps IS NULL OR bandwidth_up_kbps > 0),
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (location_id, name)
);

CREATE TABLE voucher_batches (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  location_id uuid NOT NULL REFERENCES hotspot_locations(id),
  plan_id uuid NOT NULL REFERENCES subscription_plans(id),
  created_by uuid REFERENCES operators(id),
  batch_code text NOT NULL UNIQUE,
  quantity integer NOT NULL CHECK (quantity > 0),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE vouchers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  batch_id uuid NOT NULL REFERENCES voucher_batches(id) ON DELETE CASCADE,
  secret_hash text NOT NULL UNIQUE,
  redeemed_at timestamptz,
  expires_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE customers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  phone_e164 text UNIQUE,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE customer_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  location_id uuid NOT NULL REFERENCES hotspot_locations(id),
  router_id uuid NOT NULL REFERENCES routers(id),
  plan_id uuid REFERENCES subscription_plans(id),
  customer_id uuid REFERENCES customers(id),
  voucher_id uuid REFERENCES vouchers(id),
  username text NOT NULL,
  calling_station_id macaddr NOT NULL,
  framed_ip_address inet,
  state session_state NOT NULL DEFAULT 'active',
  started_at timestamptz NOT NULL,
  expires_at timestamptz,
  stopped_at timestamptz,
  input_octets bigint NOT NULL DEFAULT 0 CHECK (input_octets >= 0),
  output_octets bigint NOT NULL DEFAULT 0 CHECK (output_octets >= 0),
  input_rate_bps bigint NOT NULL DEFAULT 0 CHECK (input_rate_bps >= 0),
  output_rate_bps bigint NOT NULL DEFAULT 0 CHECK (output_rate_bps >= 0),
  rate_limit_kbps integer CHECK (rate_limit_kbps IS NULL OR rate_limit_kbps > 0),
  acct_session_id text UNIQUE,
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX customer_sessions_live_idx ON customer_sessions (location_id, state) WHERE state IN ('active', 'paused');
CREATE INDEX customer_sessions_mac_idx ON customer_sessions (calling_station_id, started_at DESC);

CREATE TABLE payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  location_id uuid NOT NULL REFERENCES hotspot_locations(id),
  customer_id uuid REFERENCES customers(id),
  voucher_id uuid REFERENCES vouchers(id),
  channel payment_channel NOT NULL,
  amount_tzs bigint NOT NULL CHECK (amount_tzs > 0),
  provider_reference text NOT NULL,
  provider_status text NOT NULL,
  verified_at timestamptz,
  received_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (channel, provider_reference)
);

CREATE TABLE ledger_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  location_id uuid NOT NULL REFERENCES hotspot_locations(id),
  payment_id uuid UNIQUE REFERENCES payments(id),
  entry_type text NOT NULL CHECK (entry_type IN ('sale', 'refund', 'adjustment')),
  state ledger_state NOT NULL DEFAULT 'pending',
  amount_tzs bigint NOT NULL CHECK (amount_tzs <> 0),
  description text NOT NULL,
  occurred_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX ledger_entries_location_time_idx ON ledger_entries (location_id, occurred_at DESC);

CREATE TABLE operator_audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  operator_id uuid REFERENCES operators(id),
  location_id uuid REFERENCES hotspot_locations(id),
  action text NOT NULL,
  target_type text NOT NULL,
  target_id text NOT NULL,
  details jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- FreeRADIUS SQL module compatibility tables. Keep radacct as the accounting
-- event source and synchronize its rows to customer_sessions idempotently.
CREATE TABLE radcheck (
  id bigserial PRIMARY KEY,
  username text NOT NULL DEFAULT '',
  attribute text NOT NULL DEFAULT '',
  op varchar(2) NOT NULL DEFAULT ':=',
  value text NOT NULL DEFAULT ''
);
CREATE INDEX radcheck_username_idx ON radcheck (username, attribute);

CREATE TABLE radreply (
  id bigserial PRIMARY KEY,
  username text NOT NULL DEFAULT '',
  attribute text NOT NULL DEFAULT '',
  op varchar(2) NOT NULL DEFAULT '=',
  value text NOT NULL DEFAULT ''
);
CREATE INDEX radreply_username_idx ON radreply (username, attribute);

CREATE TABLE radacct (
  radacctid bigserial PRIMARY KEY,
  acctsessionid text NOT NULL DEFAULT '',
  acctuniqueid text NOT NULL UNIQUE,
  username text NOT NULL DEFAULT '',
  groupname text NOT NULL DEFAULT '',
  realm text,
  nasipaddress inet NOT NULL,
  nasportid text,
  nasporttype text,
  acctstarttime timestamptz,
  acctupdatetime timestamptz,
  acctstoptime timestamptz,
  acctinterval integer,
  acctsessiontime bigint,
  acctauthentic text,
  connectinfo_start text,
  connectinfo_stop text,
  acctinputoctets bigint NOT NULL DEFAULT 0,
  acctoutputoctets bigint NOT NULL DEFAULT 0,
  calledstationid text,
  callingstationid text,
  acctterminatecause text,
  servicetype text,
  framedprotocol text,
  framedipaddress inet,
  framedipv6address inet,
  framedipv6prefix inet,
  framedinterfaceid text,
  delegatedipv6prefix inet
);
CREATE INDEX radacct_username_start_idx ON radacct (username, acctstarttime);
CREATE INDEX radacct_nas_start_idx ON radacct (nasipaddress, acctstarttime);
