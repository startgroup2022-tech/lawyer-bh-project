import { beforeAll, afterAll, describe, it, expect } from 'vitest';
import { postgresCommunicationEventBridge, replayCommunicationSignals } from './postgres-event-bridge';
import { attachCommunicationSocket } from './socket-handler';
const url = process.env.SIGNAL_TEST_DATABASE_URL;
describe.skipIf(!url)('signaling using the real Drizzle-shared PostgreSQL client', () => {
  let sql: typeof import('@/lib/db/client').sqlClient;
  const requestId = '11111111-1111-4111-8111-111111111111';
  beforeAll(async () => {
    const parsed = new URL(url!);
    if (parsed.hostname !== '127.0.0.1' || parsed.port !== '57583' || parsed.pathname !== '/legalsos_calls_test' || process.env.DATABASE_URL !== url) throw new Error('isolated database required');
    sql = (await import('@/lib/db/client')).sqlClient;
    await sql`CREATE TABLE IF NOT EXISTS bahrain_communication_signal_events(id uuid PRIMARY KEY DEFAULT gen_random_uuid(),request_id uuid,sender_role text,event jsonb,created_at timestamptz DEFAULT now(),expires_at timestamptz DEFAULT now()+interval '2 minutes')`;
    await sql`CREATE TABLE IF NOT EXISTS bahrain_communication_calls(id uuid PRIMARY KEY,request_id uuid,status text,ringing_at timestamptz DEFAULT now())`;
  });
  afterAll(async () => { await sql?.end(); });
  it('recovers persisted answer and relay without a LISTEN subscription', async () => {
    const callId = '22222222-2222-4222-8222-222222222222';
    await sql`DELETE FROM bahrain_communication_signal_events WHERE request_id=${requestId}::uuid`;
    await sql`INSERT INTO bahrain_communication_calls(id,request_id,status) VALUES(${callId}::uuid,${requestId}::uuid,'accepted') ON CONFLICT(id) DO UPDATE SET status='accepted'`;
    const handlers = new Map<string, (...args:unknown[])=>void>();
    const received: Record<string,unknown>[] = [];
    let initialReplayDone = false;
    const stop = attachCommunicationSocket({socket:{send:payload=>{received.push(JSON.parse(payload));},close:()=>{},on:(name,handler)=>{handlers.set(name,handler);}},
      verifyTicket:()=>({requestId,actorRole:'client',actorId:'client-1'}),verifyCall:async()=>true,
      register:()=>()=>{},publish:async()=>{},replay:async ticket=>{const rows=await replayCommunicationSignals(ticket); initialReplayDone=true;return rows;},authTimeoutMs:1000});
    try {
      handlers.get('message')!(JSON.stringify({type:'auth',ticket:'local-test'}));
      await expect.poll(()=>received.some(e=>e.type==='ready')).toBe(true);
      await expect.poll(()=>initialReplayDone).toBe(true);
      const answer = {type:'signal.answer' as const,callId,sdp:'v=0'};
      const ice = {type:'signal.ice' as const,callId,candidate:'candidate:1 1 udp 1 192.0.2.1 5000 typ relay'};
      await postgresCommunicationEventBridge.publish({requestId,senderRole:'lawyer',event:answer});
      await postgresCommunicationEventBridge.publish({requestId,senderRole:'lawyer',event:ice});
      await expect.poll(()=>received.filter(e=>e.type==='signal.ice').length,{timeout:7000}).toBe(1);
      expect(received.filter(e=>e.type==='signal.answer')).toEqual([expect.objectContaining(answer)]);
      expect(received.filter(e=>e.type==='signal.ice')).toEqual([expect.objectContaining(ice)]);
    } finally {stop();}
  });
  it('persists and delivers an offer through the database notification bridge', async () => {
    const delivered: unknown[] = [];
    const stop = await postgresCommunicationEventBridge.start(value => delivered.push(value));
    const event = { type: 'signal.offer' as const, callId: 'test-call', sdp: 'v=0\r\n' };
    try {
      await postgresCommunicationEventBridge.publish({ requestId, senderRole: 'client', event });
      await expect.poll(() => delivered.length).toBe(1);
      expect(delivered[0]).toMatchObject({ requestId, senderRole: 'client', event });
    } finally { await stop(); }
  });
});
