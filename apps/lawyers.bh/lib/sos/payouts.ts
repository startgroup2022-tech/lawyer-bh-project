/** Payout maths shared between the operator dashboard and CSV
 *  export. The advocate cut is configurable via env so a future
 *  pricing change doesn't require a code deploy. */

const DEFAULT_ADVOCATE_PERCENT = 70;

export function getAdvocateCutPercent(): number {
  const raw = process.env.SOS_ADVOCATE_CUT_PERCENT;
  if (!raw) return DEFAULT_ADVOCATE_PERCENT;
  const n = Number(raw);
  if (!Number.isFinite(n) || n < 0 || n > 100) return DEFAULT_ADVOCATE_PERCENT;
  return n;
}

export interface AdvocatePayoutRow {
  advocateId: string;
  fullName: string;
  registrationNo: string;
  email: string | null;
  phone: string;
  isActive: boolean;
  /** Cases that finished service and were paid by the client. */
  paidCompletedCount: number;
  /** Same set, but among those: paid out to the advocate already. */
  settledCount: number;
  outstandingCount: number;
  /** BHD totals from the captured payments. */
  grossPaidBhd: number;
  outstandingGrossBhd: number;
  /** Derived from grossPaidBhd × percent. Rounded to fils (3 dp). */
  advocateCutBhd: number;
  outstandingAdvocateCutBhd: number;
  platformCutBhd: number;
}
