CREATE TABLE IF NOT EXISTS mobile_client_notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id uuid REFERENCES bahrain_emergency_requests(id) ON DELETE CASCADE,
  kind text NOT NULL,
  source_key text,
  title_ar text,
  body_ar text,
  title_en text,
  body_en text,
  created_at timestamptz(3) NOT NULL DEFAULT clock_timestamp()
);
--> statement-breakpoint
ALTER TABLE mobile_client_notifications
  ADD COLUMN IF NOT EXISTS request_id uuid REFERENCES bahrain_emergency_requests(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS kind text,
  ADD COLUMN IF NOT EXISTS source_key text,
  ADD COLUMN IF NOT EXISTS title_ar text,
  ADD COLUMN IF NOT EXISTS body_ar text,
  ADD COLUMN IF NOT EXISTS title_en text,
  ADD COLUMN IF NOT EXISTS body_en text,
  ADD COLUMN IF NOT EXISTS created_at timestamptz(3) DEFAULT clock_timestamp();
--> statement-breakpoint
UPDATE mobile_client_notifications SET kind='unknown' WHERE kind IS NULL;
--> statement-breakpoint
UPDATE mobile_client_notifications SET created_at=clock_timestamp() WHERE created_at IS NULL;
--> statement-breakpoint
ALTER TABLE mobile_client_notifications
  ALTER COLUMN kind SET NOT NULL,
  ALTER COLUMN created_at SET NOT NULL;
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS mobile_client_notifications_source_key_uidx
  ON mobile_client_notifications(source_key);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS mobile_client_notifications_request_cursor_idx
  ON mobile_client_notifications(request_id,created_at DESC,id DESC);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS mobile_client_notification_reads (
  owner_key text NOT NULL,
  notification_id uuid NOT NULL REFERENCES mobile_client_notifications(id) ON DELETE CASCADE,
  read_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY(owner_key,notification_id)
);
--> statement-breakpoint
CREATE OR REPLACE FUNCTION record_mobile_client_notification() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF TG_TABLE_NAME = 'bahrain_emergency_requests' THEN
    IF NEW.payment_status IS DISTINCT FROM OLD.payment_status AND NEW.payment_status::text IN ('success','failed','refunded') THEN
      INSERT INTO mobile_client_notifications(request_id,kind)
      VALUES (NEW.id,'payment_' || NEW.payment_status::text);
    END IF;
    IF NEW.service_status IS DISTINCT FROM OLD.service_status AND NEW.service_status::text <> 'pending' THEN
      INSERT INTO mobile_client_notifications(request_id,kind)
      VALUES (NEW.id,'service_' || NEW.service_status::text);
    END IF;
  ELSIF TG_TABLE_NAME = 'bahrain_communication_messages' THEN
    IF NEW.sender_role::text = 'lawyer' THEN
      INSERT INTO mobile_client_notifications(request_id,kind,source_key,created_at)
      VALUES (NEW.request_id,'new_message','message:' || NEW.id::text,NEW.created_at)
      ON CONFLICT(source_key) DO NOTHING;
    END IF;
  ELSIF TG_TABLE_NAME = 'bahrain_admin_mobile_notification_sends' THEN
    IF NEW.state::text = 'completed' AND NEW.audience::text IN ('clients','everyone') AND NEW.completed_at IS NOT NULL THEN
      INSERT INTO mobile_client_notifications(kind,source_key,title_ar,body_ar,title_en,body_en,created_at)
      VALUES ('announcement','admin:' || NEW.id::text,NEW.title_ar,NEW.body_ar,NEW.title_en,NEW.body_en,NEW.completed_at)
      ON CONFLICT(source_key) DO NOTHING;
    END IF;
  END IF;
  RETURN NEW;
END $$;
--> statement-breakpoint
DROP TRIGGER IF EXISTS mobile_client_request_notification ON bahrain_emergency_requests;
--> statement-breakpoint
CREATE TRIGGER mobile_client_request_notification
AFTER UPDATE OF payment_status,service_status ON bahrain_emergency_requests
FOR EACH ROW EXECUTE FUNCTION record_mobile_client_notification();
--> statement-breakpoint
DROP TRIGGER IF EXISTS mobile_client_message_notification ON bahrain_communication_messages;
--> statement-breakpoint
CREATE TRIGGER mobile_client_message_notification
AFTER INSERT ON bahrain_communication_messages
FOR EACH ROW EXECUTE FUNCTION record_mobile_client_notification();
--> statement-breakpoint
DROP TRIGGER IF EXISTS mobile_client_admin_notification ON bahrain_admin_mobile_notification_sends;
--> statement-breakpoint
CREATE TRIGGER mobile_client_admin_notification
AFTER INSERT OR UPDATE OF state ON bahrain_admin_mobile_notification_sends
FOR EACH ROW EXECUTE FUNCTION record_mobile_client_notification();
--> statement-breakpoint
INSERT INTO mobile_client_notifications(request_id,kind,source_key,created_at)
SELECT request_id,'new_message','message:' || id::text,created_at
FROM bahrain_communication_messages
WHERE sender_role::text='lawyer'
ON CONFLICT(source_key) DO NOTHING;
--> statement-breakpoint
INSERT INTO mobile_client_notifications(kind,source_key,title_ar,body_ar,title_en,body_en,created_at)
SELECT 'announcement','admin:' || id::text,title_ar,body_ar,title_en,body_en,completed_at
FROM bahrain_admin_mobile_notification_sends
WHERE state::text='completed' AND audience::text IN ('clients','everyone') AND completed_at IS NOT NULL
ON CONFLICT(source_key) DO NOTHING;
