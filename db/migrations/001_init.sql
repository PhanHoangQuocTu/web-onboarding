CREATE TABLE quiz_sessions (
  id uuid PRIMARY KEY,
  answers jsonb NOT NULL DEFAULT '{}',
  email text,
  plan text,
  step text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE paddle_customers (
  id text PRIMARY KEY,
  email text,
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE subscriptions (
  id text PRIMARY KEY,
  customer_id text,
  session_id uuid,
  status text NOT NULL,
  price_id text,
  current_period_end timestamptz,
  canceled_at timestamptz,
  last_event_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE transactions (
  id text PRIMARY KEY,
  subscription_id text,
  customer_id text,
  session_id uuid,
  status text NOT NULL,
  total text,
  currency text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX transactions_subscription_id_idx ON transactions (subscription_id);

CREATE TABLE activation_codes (
  code text PRIMARY KEY,
  subscription_id text NOT NULL UNIQUE REFERENCES subscriptions (id),
  first_redeemed_at timestamptz,
  last_redeemed_at timestamptz,
  redeem_count integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE webhook_events (
  id text PRIMARY KEY,
  event_type text NOT NULL,
  occurred_at timestamptz NOT NULL,
  received_at timestamptz NOT NULL DEFAULT now()
);
