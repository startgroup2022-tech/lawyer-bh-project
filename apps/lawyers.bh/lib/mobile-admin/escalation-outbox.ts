type Sql = (parts: TemplateStringsArray, ...values: unknown[]) => Promise<Array<{ id: string }>>;
type Database = { begin(callback: (transaction: Sql) => Promise<boolean>): Promise<boolean> };

export async function markEscalatedAndEnqueue(database: Database, requestId: string): Promise<boolean> {
  return database.begin(async (sql) => {
    const updated = await sql`
      UPDATE public.bahrain_emergency_requests
      SET admin_escalated_at = now(), updated_at = now()
      WHERE id = ${requestId}::uuid
        AND payment_status = 'success'
        AND tap_status = 'CAPTURED'
        AND service_status = 'pending'
        AND assigned_lawyer_id IS NULL
        AND candidate_lawyer_id IS NULL
        AND admin_escalated_at IS NULL
      RETURNING id
    `;
    if (updated.length === 0) return false;
    await sql`
      INSERT INTO public.mobile_admin_escalation_outbox
        (request_id, event_type, status, next_attempt_at)
      VALUES (${requestId}::uuid, 'admin_request_escalated', 'pending', now())
      ON CONFLICT (request_id, event_type) DO NOTHING
    `;
    return true;
  });
}
