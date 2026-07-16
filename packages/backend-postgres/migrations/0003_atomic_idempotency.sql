DELETE FROM platform.idempotency_records
WHERE state <> 'completed' OR response_status IS NULL;

ALTER TABLE platform.idempotency_records
  DROP CONSTRAINT idempotency_records_state_check,
  DROP COLUMN state,
  DROP COLUMN locked_by,
  DROP COLUMN locked_until,
  ALTER COLUMN response_status SET NOT NULL,
  ADD CONSTRAINT idempotency_records_request_hash_check
    CHECK (request_hash ~ '^[0-9a-f]{64}$'),
  ADD CONSTRAINT idempotency_records_procedure_id_length_check
    CHECK (char_length(procedure_id) BETWEEN 3 AND 200),
  ADD CONSTRAINT idempotency_records_key_length_check
    CHECK (char_length(idempotency_key) BETWEEN 1 AND 128),
  ADD CONSTRAINT idempotency_records_expiry_order_check
    CHECK (expires_at > created_at);
