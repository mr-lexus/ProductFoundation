CREATE TABLE platform.idempotency_records (
  scope_id uuid NOT NULL,
  procedure_id text NOT NULL,
  idempotency_key text NOT NULL,
  request_hash character(64) NOT NULL,
  state text NOT NULL,
  response_status integer,
  response_body jsonb,
  locked_until timestamp with time zone,
  expires_at timestamp with time zone NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  PRIMARY KEY (scope_id, procedure_id, idempotency_key),
  CONSTRAINT idempotency_records_state_check
    CHECK (state IN ('processing', 'completed', 'failed')),
  CONSTRAINT idempotency_records_response_status_check
    CHECK (response_status IS NULL OR response_status BETWEEN 100 AND 599)
);

CREATE INDEX idempotency_records_expiry_idx
  ON platform.idempotency_records (expires_at);

CREATE TABLE platform.outbox_messages (
  id uuid PRIMARY KEY,
  scope_id uuid NOT NULL,
  aggregate_type text NOT NULL,
  aggregate_id text NOT NULL,
  event_type text NOT NULL,
  payload jsonb NOT NULL,
  occurred_at timestamp with time zone NOT NULL,
  available_at timestamp with time zone NOT NULL DEFAULT now(),
  attempt_count integer NOT NULL DEFAULT 0,
  locked_at timestamp with time zone,
  locked_by text,
  processed_at timestamp with time zone,
  last_error text,
  CONSTRAINT outbox_messages_attempt_count_check CHECK (attempt_count >= 0)
);

CREATE INDEX outbox_messages_pending_idx
  ON platform.outbox_messages (available_at, occurred_at)
  WHERE processed_at IS NULL;

CREATE INDEX outbox_messages_scope_idx
  ON platform.outbox_messages (scope_id, occurred_at);
