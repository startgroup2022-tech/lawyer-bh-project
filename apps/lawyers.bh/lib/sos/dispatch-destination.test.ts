import { beforeEach, expect, it, vi } from 'vitest';
const queries = vi.hoisted(() => [] as { sql: string; values: unknown[] }[]);
vi.mock('server-only', () => ({}));
vi.mock('@/lib/db/client', () => {
  const tx = async (parts: TemplateStringsArray, ...values: unknown[]) => {
    const sql = parts.join('?'); queries.push({sql, values});
    if (sql.includes('FOR UPDATE')) return [{id:'request',service_status:'pending',excluded_lawyer_ids:[]}];
    return [];
  };
  return {sqlClient: { begin: (fn: (t: typeof tx) => unknown) => fn(tx) }};
});
import { getOrSelectCandidate, type PaidMobileBooking } from './live-dispatch-store';
const booking: PaidMobileBooking = {id:'request',countryCode:'BH',locale:'ar',service:'test',amountBhd:150,customerName:'Test',customerPhone:'',caseType:'test',workflowType:'emergency_dispatch'};
beforeEach(() => queries.splice(0));
it('persists the validated destination with candidate selection even if no lawyer is available', async () => {
  await getOrSelectCandidate({booking,customerLocation:{lat:26.2,lng:50.5,address:'Test'}});
  const update = queries.find(q => q.sql.includes('UPDATE public.bahrain_emergency_requests'))!;
  expect(update.sql).toMatch(/location\s*=/);
  expect(update.values).toContain(JSON.stringify({lat:26.2,lng:50.5,address:'Test'}));
});
it('direct consultation does not save a GPS destination', async () => {
  await getOrSelectCandidate({booking:{...booking,workflowType:'direct_consultation'}});
  const update = queries.find(q => q.sql.includes('UPDATE public.bahrain_emergency_requests'))!;
  expect(update.values).toContain(null);
  expect(update.values.some(v => typeof v === 'string' && v.includes('"lat"'))).toBe(false);
});
