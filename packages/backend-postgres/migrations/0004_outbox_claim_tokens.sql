UPDATE platform.outbox_messages
SET locked_at = NULL, locked_by = NULL
WHERE locked_at IS NOT NULL OR locked_by IS NOT NULL;

ALTER TABLE platform.outbox_messages
  ADD COLUMN claim_token uuid,
  ADD COLUMN locked_until timestamp with time zone,
  ADD CONSTRAINT outbox_messages_lock_consistency_check
    CHECK (
      (locked_at IS NULL AND locked_by IS NULL AND locked_until IS NULL AND claim_token IS NULL)
      OR
      (locked_at IS NOT NULL AND locked_by IS NOT NULL AND locked_until IS NOT NULL AND claim_token IS NOT NULL)
    ),
  ADD CONSTRAINT outbox_messages_lock_order_check
    CHECK (locked_until IS NULL OR locked_until > locked_at);
