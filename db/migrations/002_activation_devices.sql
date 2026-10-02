ALTER TABLE activation_codes
  ADD COLUMN device_id text,
  ADD COLUMN device_count integer NOT NULL DEFAULT 0;

CREATE TABLE activation_devices (
  code text NOT NULL REFERENCES activation_codes (code),
  device_id text NOT NULL,
  first_redeemed_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (code, device_id)
);
