ALTER TABLE legalsos_deletion_notifications
  DROP CONSTRAINT legalsos_deletion_notifications_state_check;
--> statement-breakpoint
ALTER TABLE legalsos_deletion_notifications
  ADD CONSTRAINT legalsos_deletion_notifications_state_check CHECK(state IN ('pending','sent','skipped'));
