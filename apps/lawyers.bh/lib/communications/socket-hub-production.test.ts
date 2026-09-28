import { afterEach, expect, it, vi } from 'vitest';
afterEach(() => { delete globalThis.__communicationSocketHub; vi.unstubAllEnvs(); vi.resetModules(); });
it('keeps the bridge delivery target and later sockets in the same production hub', async () => {
  vi.stubEnv('NODE_ENV', 'production');
  delete globalThis.__communicationSocketHub;
  vi.resetModules();
  const bridgeModule = await import('./socket-hub');
  const deliver = bridgeModule.communicationSocketHub.deliver;
  vi.resetModules();
  const socketModule = await import('./socket-hub');
  const received: string[] = [];
  const unregister = socketModule.communicationSocketHub.register({ requestId: 'request', actorRole: 'lawyer', actorId: 'lawyer', send: payload => received.push(payload) });
  deliver({ requestId: 'request', senderRole: 'client', event: { type: 'signal.answer', callId: 'call', sdp: 'answer' } });
  unregister();
  expect(received.map(payload => JSON.parse(payload).type)).toEqual(['signal.answer']);
});
