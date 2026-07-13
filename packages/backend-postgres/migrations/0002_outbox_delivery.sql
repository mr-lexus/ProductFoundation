ALTER TABLE platform.outbox_messages
  ADD COLUMN schema_version integer NOT NULL DEFAULT 1,
  ADD COLUMN dead_lettered_at timestamp with time zone;

ALTER TABLE platform.outbox_messages
  ADD CONSTRAINT outbox_messages_schema_version_check
  CHECK (schema_version > 0);

CREATE INDEX outbox_messages_dead_letter_idx
  ON platform.outbox_messages (dead_lettered_at)
  WHERE dead_lettered_at IS NOT NULL;
