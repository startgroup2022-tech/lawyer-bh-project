import { beforeEach, expect, it, vi } from 'vitest';
const state = vi.hoisted(() => ({ closed: [] as string[], selected: null as string | null, writes: 0 }));
const first = '11111111-1111-4111-8111-111111111111';
const second = '22222222-2222-4222-8222-222222222222';
vi.mock('server-only', () => ({}));
vi.mock('@/lib/db/client', () => {
  const query = async (parts: TemplateStringsArray, ...values: unknown[]) => {
    const text = parts.join('?');
    if (text.includes('FROM legalsos_account_lifecycle')) {
      const ids = Array.isArray(values[0]) ? values[0] : [values[1]];
      return state.closed.filter(id => ids.includes(id)).map(id => ({ id, subject_id: id }));
    }
    if (text.includes('FROM public.bahrain_lawyers')) return [
      '11111111-1111-4111-8111-111111111111', '22222222-2222-4222-8222-222222222222',
    ].map(id => ({ id, name: 'Synthetic Lawyer', live_location: { lat: 26.2, lng: 50.5 },
      live_location_updated_at: new Date('2026-09-13T09:00:00Z'), emergency_radius_km: 30,
      is_active: true, status: 'approved', suspension_type: null, is_emergency_ready: true,
      location_sharing_enabled: true, emergency_rates: null, rating: null,
      experience_years: 2, language: 'ar', subscription_types: [], created_at: new Date('2025-01-01'),
    }));
    if (text.includes('UPDATE public.bahrain_emergency_requests')) { state.writes++; return []; }
    if (text.includes('FROM public.bahrain_emergency_requests')) return [{
      id: '33333333-3333-4333-8333-333333333333', case_ref: 'SYNTHETIC',
      candidate_lawyer_id: state.selected, customer_approved_at: null, lawyer_response_deadline: null,
      assigned_lawyer_id: null, service_status: 'pending', excluded_lawyer_ids: [],
    }];
    throw new Error('Unexpected test SQL');
  };
  return { sqlClient: Object.assign(query, { begin: (run: (tx: typeof query) => unknown) => run(query) }) };
});
import { decideCandidate, getOrSelectCandidate, type PaidMobileBooking } from './live-dispatch-store';
beforeEach(() => { state.closed = []; state.selected = null; state.writes = 0; });
const booking: PaidMobileBooking = { id: '33333333-3333-4333-8333-333333333333', countryCode: 'BH',
  locale: 'ar', service: 'Test', amountBhd: 10, customerName: 'Test', customerPhone: '+97336000000',
  caseType: 'test', workflowType: 'emergency_dispatch',
};
it.each(['emergency_dispatch', 'direct_consultation'] as const)('does not select closed lawyers for %s', async workflowType => {
  const input = { booking: { ...booking, workflowType }, customerLocation: { lat: 26.2, lng: 50.5 }, now: new Date('2026-09-13T09:00:00Z') };
  expect((await getOrSelectCandidate(input)).candidate?.id).toBe(first);
  state.closed = [first];
  expect((await getOrSelectCandidate(input)).candidate?.id).toBe(second);
  state.closed = [first, second];
  expect((await getOrSelectCandidate(input)).candidate).toBeNull();
});
it('rejects approval if the displayed lawyer has since closed the app account', async () => {
  state.selected = first;
  state.closed = [first];
  await expect(decideCandidate({ bookingId: booking.id, candidateId: first, action: 'approve' })).rejects.toThrow('candidate_changed');
  expect(state.writes).toBe(0);
});
