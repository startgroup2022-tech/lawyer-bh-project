import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({ sql: vi.fn() }));
vi.mock('server-only', () => ({}));
vi.mock('./client', () => ({ sqlClient: mocks.sql }));

import { getPlatformReadyCountry } from './country-tables';

describe('platform-ready country lookup', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.sql.mockResolvedValue([{ code: 'BH', table_prefix: 'bahrain', name_ar: 'البحرين', name_en: 'Bahrain', currency_code: 'BHD', default_locale: 'ar' }]);
  });

  it.each(['lawyers', 'legal_sos'] as const)('queries provisioned %s countries', async platform => {
    await expect(getPlatformReadyCountry('bh', platform)).resolves.toMatchObject({ code: 'BH', tablePrefix: 'bahrain' });
    expect(mocks.sql).toHaveBeenCalledTimes(1);
    expect(mocks.sql.mock.calls[0]?.slice(1)).toEqual(expect.arrayContaining(['BH', platform]));
  });

  it('rejects an invalid runtime product before querying the database', async () => {
    await expect(getPlatformReadyCountry('BH', undefined as never)).resolves.toBeNull();
    await expect(getPlatformReadyCountry('BH', 'app' as never)).resolves.toBeNull();
    expect(mocks.sql).not.toHaveBeenCalled();
  });
});
