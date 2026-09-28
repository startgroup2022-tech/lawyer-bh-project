import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({ execute: vi.fn() }));
vi.mock('server-only', () => ({}));
vi.mock('@/lib/db/client', () => ({ db: { execute: mocks.execute } }));

import { activateCountryPlatform, setCountryPlatformEnabled } from './platform-activation';

describe('country platform activation', () => {
  beforeEach(() => vi.resetAllMocks());

  it('delegates first and repeated activation to the idempotent database function', async () => {
    mocks.execute
      .mockResolvedValueOnce([{ code: 'SA' }])
      .mockResolvedValueOnce([{ countryCode: 'SA', product: 'legal_sos', enabled: true, tablesProvisioned: true }])
      .mockResolvedValueOnce([{ code: 'SA' }])
      .mockResolvedValueOnce([{ countryCode: 'SA', product: 'legal_sos', enabled: true, tablesProvisioned: true }]);
    await expect(activateCountryPlatform('sa', 'legal_sos')).resolves.toMatchObject({ enabled: true, tablesProvisioned: true });
    await expect(activateCountryPlatform('SA', 'legal_sos')).resolves.toMatchObject({ enabled: true, tablesProvisioned: true });
    expect(mocks.execute).toHaveBeenCalledTimes(4);
  });

  it('disables only the requested canonical flag without deleting history', async () => {
    mocks.execute
      .mockResolvedValueOnce([{ code: 'BH' }])
      .mockResolvedValueOnce([{ countryCode: 'BH', product: 'lawyers', enabled: false, tablesProvisioned: true }]);
    await expect(setCountryPlatformEnabled('BH', 'lawyers', false)).resolves.toMatchObject({ enabled: false, tablesProvisioned: true });
    const query = String(mocks.execute.mock.calls[1]?.[0]);
    expect(query).not.toMatch(/DELETE|DROP|is_active|tables_provisioned\s*=/i);
  });

  it('fails with a stable not-found error before activation or disable SQL', async () => {
    mocks.execute.mockResolvedValue([]);
    await expect(setCountryPlatformEnabled('BH', 'legal_sos', true)).rejects.toThrow('COUNTRY_PLATFORM_NOT_FOUND');
    expect(mocks.execute).toHaveBeenCalledTimes(1);
  });
});
