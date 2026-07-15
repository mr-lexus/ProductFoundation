ALTER TABLE platform.outbox_messages
  ADD COLUMN schema_version integer NOT NULL DEFAULT 1,
  ADD COLUMN dead_lettered_at timestamp with time zone;

ALTER TABLE platform.outbox_messages
  ADD CONSTRAINT outbox_messages_schema_version_check
  CHECK (schema_version > 0);

DROP INDEX platform.outbox_messages_pending_idx;

CREATE INDEX outbox_messages_pending_idx
  ON platform.outbox_messages (available_at, occurred_at)
  WHERE processed_at IS NULL AND dead_lettered_at IS NULL;

CREATE INDEX outbox_messages_dead_letter_idx
  ON platform.outbox_messages (dead_lettered_at)
  WHERE dead_lettered_at IS NOT NULL;
