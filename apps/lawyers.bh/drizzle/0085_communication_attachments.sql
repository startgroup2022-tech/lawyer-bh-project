CREATE TABLE IF NOT EXISTS bahrain_communication_attachments (
  id uuid PRIMARY KEY,
  request_id uuid NOT NULL REFERENCES bahrain_emergency_requests(id),
  sender_role text NOT NULL CHECK (sender_role IN ('client', 'lawyer')),
  sender_id text NOT NULL,
  name text NOT NULL,
  size integer NOT NULL CHECK (size > 0 AND size <= 10485760),
  content bytea NOT NULL DEFAULT ''::bytea,
  mime text,
  message_id uuid UNIQUE REFERENCES bahrain_communication_messages(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  CHECK (octet_length(content) <= size)
);
CREATE INDEX IF NOT EXISTS communication_attachments_request_idx ON bahrain_communication_attachments(request_id);
