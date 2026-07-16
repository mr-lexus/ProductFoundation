CREATE SCHEMA IF NOT EXISTS app;

CREATE TABLE app.reference_durable_probes (
  id uuid PRIMARY KEY,
  value text NOT NULL,
  created_at timestamp with time zone NOT NULL,
  delivered_at timestamp with time zone,
  CONSTRAINT reference_durable_probes_value_length_check
    CHECK (char_length(value) BETWEEN 1 AND 128),
  CONSTRAINT reference_durable_probes_delivery_order_check
    CHECK (delivered_at IS NULL OR delivered_at >= created_at)
);
