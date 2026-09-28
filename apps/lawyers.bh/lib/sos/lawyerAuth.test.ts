import { expect, it, vi } from 'vitest';
vi.mock('server-only', () => ({}));
vi.mock('next/headers', () => ({ cookies: async () => { throw new Error('unexpected_web_fallback'); }, headers: async () => new Headers() }));
vi.mock('@/lib/db/client', () => ({ db: {}, schema: {} }));
vi.mock('@/lib/mobile-lawyer-auth', () => ({ getMobileLawyerSession: async () => null }));
import { requireAdvocateRequest } from './lawyerAuth';

it('returns unauthorized for a rejected app bearer instead of trying website authentication', async () => {
  await expect(requireAdvocateRequest(new Request('https://lawyers.bh', {
    headers: { authorization: 'Bearer revoked-token' },
  }))).resolves.toEqual({ ok: false, status: 401 });
});
