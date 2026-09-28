CREATE TABLE mobile_lawyer_notifications (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 lawyer_id uuid NOT NULL REFERENCES bahrain_lawyers(id) ON DELETE CASCADE,
 request_id uuid NOT NULL REFERENCES bahrain_emergency_requests(id) ON DELETE CASCADE,
 kind text NOT NULL,
 created_at timestamptz(3) NOT NULL DEFAULT clock_timestamp(),
 read_at timestamptz
);
--> statement-breakpoint
CREATE INDEX mobile_lawyer_notifications_owner_cursor ON mobile_lawyer_notifications(lawyer_id,created_at DESC,id DESC);
--> statement-breakpoint
CREATE FUNCTION record_mobile_lawyer_notification() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE owner_id uuid;
BEGIN
 IF TG_TABLE_NAME='bahrain_communication_messages' THEN
   IF NEW.sender_role='client' THEN
     SELECT assigned_lawyer_id INTO owner_id FROM bahrain_emergency_requests WHERE id=NEW.request_id;
     IF owner_id IS NOT NULL THEN
       INSERT INTO mobile_lawyer_notifications(lawyer_id,request_id,kind,created_at) VALUES(owner_id,NEW.request_id,'new_message',NEW.created_at);
     END IF;
   END IF;
 ELSE
   IF NEW.candidate_lawyer_id IS NOT NULL AND NEW.customer_approved_at IS NOT NULL AND NEW.assigned_lawyer_id IS NULL
      AND (NEW.customer_approved_at IS DISTINCT FROM OLD.customer_approved_at OR NEW.candidate_lawyer_id IS DISTINCT FROM OLD.candidate_lawyer_id) THEN
     INSERT INTO mobile_lawyer_notifications(lawyer_id,request_id,kind) VALUES(NEW.candidate_lawyer_id,NEW.id,'lawyer_offer');
   END IF;
   IF OLD.candidate_lawyer_id IS NOT NULL AND OLD.customer_approved_at IS NOT NULL AND OLD.assigned_lawyer_id IS NULL
      AND OLD.lawyer_response_deadline<=clock_timestamp() AND NEW.candidate_lawyer_id IS DISTINCT FROM OLD.candidate_lawyer_id
      AND NEW.assigned_lawyer_id IS NULL THEN
     INSERT INTO mobile_lawyer_notifications(lawyer_id,request_id,kind) VALUES(OLD.candidate_lawyer_id,NEW.id,'lawyer_offer_expired');
   END IF;
   IF NEW.service_status IS DISTINCT FROM OLD.service_status AND COALESCE(NEW.assigned_lawyer_id,OLD.assigned_lawyer_id) IS NOT NULL THEN
     INSERT INTO mobile_lawyer_notifications(lawyer_id,request_id,kind) VALUES(COALESCE(NEW.assigned_lawyer_id,OLD.assigned_lawyer_id),NEW.id,'service_'||NEW.service_status::text);
   END IF;
 END IF;
 RETURN NEW;
END $$;
--> statement-breakpoint
CREATE TRIGGER mobile_lawyer_request_notification AFTER UPDATE ON bahrain_emergency_requests FOR EACH ROW EXECUTE FUNCTION record_mobile_lawyer_notification();
--> statement-breakpoint
CREATE TRIGGER mobile_lawyer_message_notification AFTER INSERT ON bahrain_communication_messages FOR EACH ROW EXECUTE FUNCTION record_mobile_lawyer_notification();
