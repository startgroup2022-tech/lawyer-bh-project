import {resolveRequestCommunicationAccess} from '@/lib/communications/server-access';
import {ATTACHMENT_CHUNK_BYTES, MAX_ATTACHMENT_BYTES, validateAttachment} from '@/lib/communications/attachment-policy';
import {isActiveChatSuspension} from '@/lib/communications/safety/policy';
import {getCommunicationSafetyState} from '@/lib/communications/safety/store';
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
type Context = {params: Promise<{requestId:string; attachmentId:string}>};
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
class Failure extends Error { constructor(public status:number, message:string) {super(message);} }

export async function PUT(request:Request, context:Context) {
  const {requestId, attachmentId} = await context.params;
  if (!uuid.test(requestId) || !uuid.test(attachmentId)) return Response.json({error:'invalid_id'},{status:400});
  const participant = await resolveRequestCommunicationAccess(requestId,request);
  if (!participant) return Response.json({error:'communication_forbidden'},{status:403});
  if (!participant.capabilities.send) return Response.json({error:'communication_read_only'},{status:409});
  const safety=await getCommunicationSafetyState(participant);
  if(safety.blockedByMe||safety.blockedByPeer) return Response.json({error:'communication_blocked'},{status:409});
  if(isActiveChatSuspension(safety.chatSuspendedUntil)) return Response.json({error:'chat_suspended'},{status:409});
  try {
    const size = Number(request.headers.get('x-file-size'));
    const offset = Number(request.headers.get('x-file-offset'));
    const name = decodeURIComponent(request.headers.get('x-file-name') ?? '').replace(/[\x00-\x1f/\\]/g,'_').slice(0,160);
    if (!name || !Number.isSafeInteger(size) || size <= 0 || size > MAX_ATTACHMENT_BYTES || !Number.isSafeInteger(offset) || offset < 0) throw new Failure(400,'invalid_attachment');
    const reader = request.body?.getReader();
    if (!reader) throw new Failure(400,'empty_chunk');
    const chunks:Buffer[]=[]; let length=0;
    while(true) {const next=await reader.read(); if(next.done) break; length+=next.value.length; if(length>ATTACHMENT_CHUNK_BYTES) {await reader.cancel(); throw new Failure(413,'chunk_too_large');} chunks.push(Buffer.from(next.value));}
    if (!length || offset+length>size) throw new Failure(400,'invalid_chunk');
    const chunk = Buffer.concat(chunks);
    const {sqlClient} = await import('@/lib/db/client');
    const result = await sqlClient.begin(async tx => {
      const [caseRow] = await tx`SELECT service_status, assigned_lawyer_id::text FROM bahrain_emergency_requests WHERE id=${requestId}::uuid FOR UPDATE`;
      const lawyerId=participant.actor.role==='lawyer'?participant.actor.id:participant.peer.id;
      if (!caseRow || caseRow.assigned_lawyer_id!==lawyerId || !['mobilizing','arrived','in_progress'].includes(caseRow.service_status)) throw new Failure(409,'communication_read_only');
      await tx`DELETE FROM bahrain_communication_attachments WHERE request_id=${requestId}::uuid AND message_id IS NULL AND created_at<now()-interval '24 hours'`;
      const [quota] = await tx`SELECT count(*)::int AS count FROM bahrain_communication_attachments WHERE request_id=${requestId}::uuid AND message_id IS NULL AND id<>${attachmentId}::uuid`;
      if (quota.count>=3) throw new Failure(429,'too_many_pending_uploads');
      await tx`INSERT INTO bahrain_communication_attachments(id,request_id,sender_role,sender_id,name,size) VALUES(${attachmentId}::uuid,${requestId}::uuid,${participant.actor.role},${participant.actor.id},${name},${size}) ON CONFLICT(id) DO NOTHING`;
      const [file] = await tx`SELECT * FROM bahrain_communication_attachments WHERE id=${attachmentId}::uuid AND request_id=${requestId}::uuid AND sender_role=${participant.actor.role} AND sender_id=${participant.actor.id} FOR UPDATE`;
      if (!file) throw new Failure(403,'attachment_forbidden');
      if(file.name!==name || file.size!==size) throw new Failure(409,'attachment_conflict');
      if(file.message_id) return {offset:size,complete:true};
      const existing=Buffer.from(file.content);
      if(existing.length!==offset) return {offset:existing.length,complete:false};
      const bytes=Buffer.concat([existing,chunk]);
      if(bytes.length<size) {await tx`UPDATE bahrain_communication_attachments SET content=${bytes} WHERE id=${attachmentId}::uuid`;return {offset:bytes.length,complete:false};}
      let mime:string;
      try {mime=validateAttachment(name,bytes);} catch {throw new Failure(400,'attachment_type');}
      const [message]=await tx`INSERT INTO bahrain_communication_messages(request_id,sender_role,sender_id,client_message_id,body) VALUES(${requestId}::uuid,${participant.actor.role},${participant.actor.id},${attachmentId}::uuid,${name}) RETURNING id`;
      await tx`UPDATE bahrain_communication_attachments SET content=${bytes}, mime=${mime}, message_id=${message.id}::uuid WHERE id=${attachmentId}::uuid`;
      return {offset:size,complete:true,newMessage:true};
    });
    if ('newMessage' in result && result.newMessage) {
      try {
        const {mobilePushSender} = await import('@/lib/sos/mobile-push');
        const sender = await mobilePushSender();
        if(participant.peer.role==='lawyer') await sender.sendLawyerPush({lawyerId:participant.peer.id,eventType:'new_message',requestId,locale:'ar'});
        else await sender.sendClientPush({eventType:'new_message',requestId,locale:'ar'});
      } catch { console.warn('[chat attachments] push delivery failed'); }
    }
    return Response.json(result);
  } catch(error) {return Response.json({error:error instanceof Failure?error.message:'attachment_upload_failed'},{status:error instanceof Failure?error.status:500});}
}

export async function GET(request:Request, context:Context) {
  const {requestId,attachmentId}=await context.params;
  if(!uuid.test(requestId)||!uuid.test(attachmentId)) return Response.json({error:'invalid_id'},{status:400});
  const participant=await resolveRequestCommunicationAccess(requestId,request);
  if(!participant?.capabilities.read) return Response.json({error:'communication_forbidden'},{status:403});
  const offset=Number(new URL(request.url).searchParams.get('offset')??0);
  if(!Number.isSafeInteger(offset)||offset<0||offset>=MAX_ATTACHMENT_BYTES) return Response.json({error:'invalid_offset'},{status:400});
  const {sqlClient}=await import('@/lib/db/client');
  const [file]=await sqlClient`SELECT size,mime,substring(content from ${offset+1} for ${ATTACHMENT_CHUNK_BYTES}) AS chunk FROM bahrain_communication_attachments WHERE id=${attachmentId}::uuid AND request_id=${requestId}::uuid AND message_id IS NOT NULL`;
  if(!file) return Response.json({error:'not_found'},{status:404});
  return new Response(new Uint8Array(file.chunk),{headers:{'Content-Type':'application/octet-stream','Cache-Control':'private, no-store','X-Content-Type-Options':'nosniff','X-File-Size':String(file.size)}});
}
