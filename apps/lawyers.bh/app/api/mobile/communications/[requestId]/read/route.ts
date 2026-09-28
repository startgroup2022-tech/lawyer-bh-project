import {resolveRequestCommunicationAccess} from '@/lib/communications/server-access';
import {sqlClient} from '@/lib/db/client';

export async function POST(request:Request,context:{params:Promise<{requestId:string}>}) {
  const {requestId}=await context.params;
  const participant=await resolveRequestCommunicationAccess(requestId,request);
  if(!participant)return Response.json({error:'communication_forbidden'},{status:403});
  const body=await request.json().catch(()=>null);
  if(typeof body?.messageId!=='string'||! /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(body.messageId))
    return Response.json({error:'invalid_message_id'},{status:400});
  // One statement binds the boundary to this request and never clears or
  // overwrites a read timestamp, including repeated/concurrent acknowledgements.
  const rows=await sqlClient`
    WITH boundary AS (
      SELECT id,created_at FROM bahrain_communication_messages
      WHERE request_id=${requestId}::uuid AND id=${body.messageId}::uuid
    ), marked AS (
      UPDATE bahrain_communication_messages m SET read_at=clock_timestamp()
      FROM boundary b WHERE m.request_id=${requestId}::uuid
        AND m.sender_role<>${participant.actor.role} AND m.read_at IS NULL
        AND (m.created_at,m.id)<=(b.created_at,b.id)
      RETURNING m.id
    ) SELECT id FROM boundary`;
  if(!rows.length)return Response.json({error:'message_not_found'},{status:404});
  return Response.json({ok:true},{headers:{'Cache-Control':'no-store'}});
}
