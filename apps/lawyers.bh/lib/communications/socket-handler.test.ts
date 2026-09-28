import { describe, expect, it, vi } from "vitest";
import { attachCommunicationSocket, type CommunicationSocket } from "./socket-handler";

function fakeSocket() {
  const handlers: Record<string, Array<(...args: unknown[]) => void>> = {};
  const socket: CommunicationSocket = { send: vi.fn(), close: vi.fn(), on: vi.fn((name, handler) => { (handlers[name] ??= []).push(handler); }) };
  return { socket, emit(name: string, value?: unknown) { for (const handler of handlers[name] ?? []) handler(value); } };
}

describe("authenticated communication socket", () => {
  it('bounds recovery to call setup and retries transient reads without overlap', async () => {
    vi.useFakeTimers();
    const warning = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const peer = fakeSocket();
    let reads = 0;
    let release: ((value: string[]) => void) | undefined;
    const answer = JSON.stringify({type:'signal.answer',callId:'call-1',sdp:'v=0',eventId:'one'});
    const stop = attachCommunicationSocket({socket:peer.socket,
      verifyTicket:()=>({requestId:'request-1',actorRole:'client',actorId:'client-1'}),
      verifyCall:async()=>true,publish:async()=>{},register:()=>()=>{},authTimeoutMs:1000,
      replay:async()=>{ reads++; if(reads===1)return []; if(reads===2)throw new Error('temporary'); if(reads===3)return new Promise(resolve=>{release=resolve;}); return [answer]; }});
    try {
      peer.emit('message',JSON.stringify({type:'auth',ticket:'ticket'}));
      await vi.advanceTimersByTimeAsync(10_000);
      expect(reads).toBe(3);
      release!([answer]);
      await vi.advanceTimersByTimeAsync(65_000);
      const completedReads = reads;
      await vi.advanceTimersByTimeAsync(65_000);
      expect(reads).toBe(completedReads);
      expect(vi.mocked(peer.socket.send).mock.calls.map(([s])=>s)).toEqual([
        JSON.stringify({type:'ready',requestId:'request-1'}),answer]);
    } finally {stop();warning.mockRestore();vi.useRealTimers();}
  });
  it('recovers an answer and relay ICE persisted after authentication when live notifications are lost', async () => {
    vi.useFakeTimers();
    const peer = fakeSocket();
    const stored: string[] = [];
    const stop = attachCommunicationSocket({ socket: peer.socket,
      verifyTicket: () => ({requestId:'request-1',actorRole:'client',actorId:'client-1'}),
      verifyCall: async () => true, publish: async () => {}, register: () => () => {},
      replay: async () => [...stored], authTimeoutMs:1000 });
    try {
      peer.emit('message', JSON.stringify({type:'auth',ticket:'ticket'}));
      await vi.advanceTimersByTimeAsync(0);
      const answer = JSON.stringify({type:'signal.answer',callId:'call-1',sdp:'v=0',eventId:'answer'});
      const ice = JSON.stringify({type:'signal.ice',callId:'call-1',candidate:'candidate:1 1 udp 1 192.0.2.1 5000 typ relay',eventId:'relay'});
      stored.push(answer, ice);
      await vi.advanceTimersByTimeAsync(4000);
      expect(vi.mocked(peer.socket.send).mock.calls.map(([s]) => s)).toEqual([
        JSON.stringify({type:'ready',requestId:'request-1'}), answer, ice,
      ]);
      stop();
      stored.push(JSON.stringify({type:'signal.ice',eventId:'after-close'}));
      await vi.advanceTimersByTimeAsync(4000);
      expect(peer.socket.send).toHaveBeenCalledTimes(3);
    } finally { stop(); vi.useRealTimers(); }
  });
  it('reports publication failure without signaling payloads', async () => {
    const peer = fakeSocket();
    const diagnostic = vi.spyOn(console, 'error').mockImplementation(() => {});
    attachCommunicationSocket({ socket: peer.socket, verifyTicket: () => ({ requestId: 'request-1', actorRole: 'client', actorId: 'client-1' }), verifyCall: async () => true, publish: async () => { throw Object.assign(new Error('private payload'), { code: '42P01' }); }, register: () => () => {}, authTimeoutMs: 1000 });
    peer.emit('message', JSON.stringify({ type: 'auth', ticket: 'secret' }));
    await vi.waitFor(() => expect(peer.socket.send).toHaveBeenCalled());
    peer.emit('message', JSON.stringify({ type: 'signal.offer', callId: 'call-1', sdp: 'private sdp' }));
    await vi.waitFor(() => expect(peer.socket.close).toHaveBeenCalledWith(1011, 'socket_error'));
    expect(diagnostic).toHaveBeenCalledWith('communication_socket_failure', { requestId: 'request-1', actorRole: 'client', stage: 'publish', errorCode: '42P01', errorName: 'Error' });
  });
  it("replays a stored offer before live frames for a late receiver", async () => {
    const peer = fakeSocket();
    const offer = JSON.stringify({type:"signal.offer",callId:"call-1",sdp:"v=0",eventId:"one"});
    const replay = vi.fn(async()=>[offer]);
    attachCommunicationSocket({socket:peer.socket,
      verifyTicket:()=>({requestId:"request-1",actorRole:"lawyer",actorId:"lawyer-1"}),
      verifyCall:async()=>true,publish:vi.fn(),authTimeoutMs:1000,
      replay,register: connection=>{connection.send(offer);return ()=>{};}});
    peer.emit("message", JSON.stringify({type:"auth",ticket:"ticket"}));
    await vi.waitFor(()=>expect(peer.socket.send).toHaveBeenCalledWith(offer));
    expect(replay).toHaveBeenCalledWith({requestId:"request-1",actorRole:"lawyer",actorId:"lawyer-1"});
    expect(vi.mocked(peer.socket.send).mock.calls.filter(([value])=>value===offer)).toHaveLength(1);
  });
  it("authenticates first then publishes signaling scoped to its call", async () => {
    const peer = fakeSocket(); const publish = vi.fn();
    attachCommunicationSocket({ socket: peer.socket, verifyTicket: () => ({ requestId: "request-1", actorRole: "client", actorId: "client-1" }), verifyCall: vi.fn(async () => true), publish, register: vi.fn(() => vi.fn()), authTimeoutMs: 1000 });
    peer.emit("message", Buffer.from(JSON.stringify({ type: "auth", ticket: "ticket" })));
    await vi.waitFor(() => expect(peer.socket.send).toHaveBeenCalledWith(JSON.stringify({ type: "ready", requestId: "request-1" })));
    peer.emit("message", Buffer.from(JSON.stringify({ type: "signal.offer", callId: "call-1", sdp: "v=0" })));
    await vi.waitFor(() => expect(publish).toHaveBeenCalledWith({ requestId: "request-1", senderRole: "client", event: { type: "signal.offer", callId: "call-1", sdp: "v=0" } }));
  });

  it("closes when signaling references a call outside the ticket request", async () => {
    const peer = fakeSocket();
    attachCommunicationSocket({ socket: peer.socket, verifyTicket: () => ({ requestId: "request-1", actorRole: "lawyer", actorId: "lawyer-1" }), verifyCall: vi.fn(async () => false), publish: vi.fn(), register: vi.fn(() => vi.fn()), authTimeoutMs: 1000 });
    peer.emit("message", Buffer.from(JSON.stringify({ type: "auth", ticket: "ticket" })));
    await vi.waitFor(() => expect(peer.socket.send).toHaveBeenCalled());
    peer.emit("message", Buffer.from(JSON.stringify({ type: "signal.ice", callId: "foreign", candidate: "candidate" })));
    await vi.waitFor(() => expect(peer.socket.close).toHaveBeenCalledWith(1008, "call_forbidden"));
  });

  it("rejects a signaling frame before authentication", async () => {
    const peer = fakeSocket();
    attachCommunicationSocket({ socket: peer.socket, verifyTicket: () => null, verifyCall: vi.fn(), publish: vi.fn(), register: vi.fn(() => vi.fn()), authTimeoutMs: 1000 });
    peer.emit("message", Buffer.from(JSON.stringify({ type: "ping" })));
    await vi.waitFor(() => expect(peer.socket.close).toHaveBeenCalledWith(1008, "authentication_required"));
  });
});
