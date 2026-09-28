import {existsSync, readFileSync} from 'node:fs';
import {describe, expect, it} from 'vitest';

const migrationPath='drizzle/0076_repair_mobile_client_notifications.sql';

describe('mobile client notification repair migration',()=>{
  it('recreates the inbox schema and event triggers idempotently',()=>{
    expect(existsSync(migrationPath)).toBe(true);
    const sql=readFileSync(migrationPath,'utf8');
    expect(sql).toContain('CREATE TABLE IF NOT EXISTS mobile_client_notifications');
    expect(sql).toContain('ADD COLUMN IF NOT EXISTS request_id');
    expect(sql).toContain('ADD COLUMN IF NOT EXISTS created_at');
    expect(sql).toContain('CREATE TABLE IF NOT EXISTS mobile_client_notification_reads');
    expect(sql).toContain('CREATE UNIQUE INDEX IF NOT EXISTS mobile_client_notifications_source_key_uidx');
    expect(sql).toContain('CREATE OR REPLACE FUNCTION record_mobile_client_notification()');
    expect(sql).toContain('DROP TRIGGER IF EXISTS mobile_client_request_notification');
    expect(sql).toContain('DROP TRIGGER IF EXISTS mobile_client_message_notification');
    expect(sql).toContain('DROP TRIGGER IF EXISTS mobile_client_admin_notification');
  });
});
