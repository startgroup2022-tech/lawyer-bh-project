import bcrypt from 'bcryptjs';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
const state = vi.hoisted(() => ({ closed: false, passwordHash: '' }));
vi.mock('server-only', () => ({}));
vi.mock('@/lib/db/country-tables', () => ({ getActiveCountry: async () => ({ code: 'BH', tablePrefix: 'bahrain' }) }));
vi.mock('@/lib/db/client', () => ({
  sqlClient: async () => state.closed ? [{ id: 'closed-account' }] : [],
  schema: { bahrainLawyers: {} },
  db: { select: () => ({ from: () => ({ where: () => ({ limit: async () => [{
    id: '11111111-1111-4111-8111-111111111111', countryCode: 'BH', registrationNo: 'TEST',
    passwordHash: state.passwordHash, status: 'approved', isActive: true,
    isEmergencyReady: true, phone: '+97336000000',
  }] }) }) }) },
}));
import { POST } from './route';
import { verifyMobileLawyerToken } from '@/lib/mobile-lawyer-auth';
beforeEach(async () => {
  state.closed = false;
  state.passwordHash = await bcrypt.hash(' test passphrase ', 4);
  vi.spyOn(console, 'log').mockImplementation(() => {});
});
afterEach(() => vi.restoreAllMocks());
function request() {
  return new Request('https://lawyers.bh/api/lawyers/login', { method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ licenseNumber: 'TEST', password: ' test passphrase ', countryCode: 'BH' }),
  });
}
it('issues a usable app token for an open account with the exact password', async () => {
  const response = await POST(request());
  expect(response.status).toBe(200);
  const body = await response.json();
  expect(verifyMobileLawyerToken(body.data.token)?.lawyerId).toBe('11111111-1111-4111-8111-111111111111');
});
it('denies app login for a closed account even with its correct website password', async () => {
  state.closed = true;
  const response = await POST(request());
  expect(response.status).toBe(403);
  const body = await response.json();
  expect(body.success).toBe(false);
  expect(body.data?.token).toBeUndefined();
});
