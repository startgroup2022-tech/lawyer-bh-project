// Mock data — ported from the legalsos design bundle (admin/data.jsx).
// Matches the design's expanded shape (mapX/mapY/urgent/etc.) so the
// pixel-perfect components render without per-page massaging.

export type CaseStatus =
  | "pending"
  | "mobilizing"
  | "live"
  | "arrived"
  | "completed"
  | "cancelled"
  | "disputed"
  | "refunded"
  | "draft";

export type PaymentStatus = "pending" | "success" | "failed" | "refunded";

export interface MockCase {
  ref: string;
  client: string;
  phone: string;
  type: string;
  typeShort: string;
  fee: number;
  status: CaseStatus;
  lawyer: string;
  lawyerInit: string;
  openedMin: number;
  etaMin: number;
  location: string;
  lat?: number;
  lng?: number;
  country: string;
  lang: "EN" | "AR";
  urgent?: boolean;
  mapX?: number;
  mapY?: number;
}

export const CASES: MockCase[] = [
  { ref: "LS-2026-08842", client: "Hessa A.", phone: "+973 3322 ••71", type: "Arrest & Investigation", typeShort: "Arrest", fee: 150, status: "mobilizing", lawyer: "Sara Al-Hashimi", lawyerInit: "SA", openedMin: 2, etaMin: 4, location: "Manama · Block 318", lat: 26.22, lng: 50.58, country: "BH", lang: "AR", urgent: true, mapX: 52, mapY: 38 },
  { ref: "LS-2026-08841", client: "Omar K.", phone: "+973 3902 ••18", type: "Emergency Consultation", typeShort: "Consult", fee: 25, status: "live", lawyer: "Yusuf Al-Khalifa", lawyerInit: "YK", openedMin: 6, etaMin: 0, location: "Remote · Riffa", lang: "EN", country: "BH", mapX: 48, mapY: 56 },
  { ref: "LS-2026-08840", client: "Reem S.", phone: "+973 3711 ••92", type: "Search & Seizure", typeShort: "Search", fee: 200, status: "mobilizing", lawyer: "Noor Al-Mahmood", lawyerInit: "NM", openedMin: 8, etaMin: 9, location: "Muharraq · Galali", lat: 26.27, lng: 50.62, country: "BH", lang: "AR", mapX: 64, mapY: 24 },
  { ref: "LS-2026-08839", client: "Ahmed T.", phone: "+973 3415 ••03", type: "Travel Ban", typeShort: "Travel ban", fee: 300, status: "live", lawyer: "Layla Buhindi", lawyerInit: "LB", openedMin: 14, etaMin: 0, location: "BIA · Airport", country: "BH", lang: "AR", mapX: 70, mapY: 30 },
  { ref: "LS-2026-08838", client: "Fatima R.", phone: "+973 3299 ••40", type: "Urgent Criminal Report", typeShort: "Report", fee: 150, status: "completed", lawyer: "Khaled Al-Dosari", lawyerInit: "KD", openedMin: 38, etaMin: 0, location: "Isa Town", country: "BH", lang: "EN", mapX: 38, mapY: 60 },
  { ref: "LS-2026-08837", client: "Mariam J.", phone: "+973 3666 ••11", type: "Emergency Consultation", typeShort: "Consult", fee: 25, status: "completed", lawyer: "Sara Al-Hashimi", lawyerInit: "SA", openedMin: 52, etaMin: 0, location: "Remote", country: "BH", lang: "AR" },
  { ref: "LS-2026-08836", client: "Hassan B.", phone: "+973 3501 ••57", type: "Urgent Evidence Preservation", typeShort: "Evidence", fee: 400, status: "disputed", lawyer: "Noor Al-Mahmood", lawyerInit: "NM", openedMin: 124, etaMin: 0, location: "Sitra", country: "BH", lang: "AR", mapX: 56, mapY: 70 },
  { ref: "LS-2026-08835", client: "Khalid M.", phone: "+973 3877 ••29", type: "Arrest & Investigation", typeShort: "Arrest", fee: 150, status: "completed", lawyer: "Yusuf Al-Khalifa", lawyerInit: "YK", openedMin: 188, etaMin: 0, location: "Hamad Town", country: "BH", lang: "EN" },
  { ref: "LS-2026-08834", client: "Aisha N.", phone: "+973 3199 ••08", type: "Emergency Consultation", typeShort: "Consult", fee: 25, status: "refunded", lawyer: "—", lawyerInit: "—", openedMin: 244, etaMin: 0, location: "Remote", country: "BH", lang: "AR" },
  { ref: "LS-2026-08833", client: "Tariq H.", phone: "+973 3450 ••16", type: "Search & Seizure", typeShort: "Search", fee: 200, status: "completed", lawyer: "Layla Buhindi", lawyerInit: "LB", openedMin: 312, etaMin: 0, location: "Saar", country: "BH", lang: "EN" },
  { ref: "LS-2026-08832", client: "Noora F.", phone: "+973 3727 ••84", type: "Travel Ban", typeShort: "Travel ban", fee: 300, status: "completed", lawyer: "Khaled Al-Dosari", lawyerInit: "KD", openedMin: 410, etaMin: 0, location: "BIA · Airport", country: "BH", lang: "AR" },
  { ref: "LS-2026-08831", client: "Yousef A.", phone: "+973 3303 ••72", type: "Urgent Criminal Report", typeShort: "Report", fee: 150, status: "completed", lawyer: "Sara Al-Hashimi", lawyerInit: "SA", openedMin: 488, etaMin: 0, location: "Adliya", country: "BH", lang: "EN" },
  { ref: "LS-2026-08830", client: "Dana W.", phone: "+973 3650 ••55", type: "Emergency Consultation", typeShort: "Consult", fee: 25, status: "completed", lawyer: "Noor Al-Mahmood", lawyerInit: "NM", openedMin: 572, etaMin: 0, location: "Remote", country: "BH", lang: "EN" },
  { ref: "LS-2026-08829", client: "Salman R.", phone: "+973 3411 ••39", type: "Urgent Evidence Preservation", typeShort: "Evidence", fee: 400, status: "completed", lawyer: "Yusuf Al-Khalifa", lawyerInit: "YK", openedMin: 640, etaMin: 0, location: "Budaiya", country: "BH", lang: "AR" },
  { ref: "LS-2026-08828", client: "Hala E.", phone: "+973 3888 ••07", type: "Emergency Consultation", typeShort: "Consult", fee: 25, status: "completed", lawyer: "Layla Buhindi", lawyerInit: "LB", openedMin: 712, etaMin: 0, location: "Remote", country: "BH", lang: "AR" },
];

export interface MockLawyer {
  name: string;
  init: string;
  bar: string;
  yrs: number;
  rating: number;
  cases: number;
  country: string;
  langs: string[];
  radius: string;
  ready: boolean;
  balance: number;
}

export const LAWYERS: MockLawyer[] = [
  { name: "Sara Al-Hashimi", init: "SA", bar: "BH-4318", yrs: 11, rating: 4.92, cases: 248, country: "🇧🇭", langs: ["AR", "EN"], radius: "Manama 25km", ready: true, balance: 1850 },
  { name: "Yusuf Al-Khalifa", init: "YK", bar: "BH-2207", yrs: 14, rating: 4.88, cases: 412, country: "🇧🇭", langs: ["AR", "EN", "FR"], radius: "All BH", ready: true, balance: 2425 },
  { name: "Noor Al-Mahmood", init: "NM", bar: "BH-5184", yrs: 7, rating: 4.79, cases: 142, country: "🇧🇭", langs: ["AR", "EN"], radius: "Muharraq 18km", ready: true, balance: 950 },
  { name: "Layla Buhindi", init: "LB", bar: "BH-3902", yrs: 9, rating: 4.85, cases: 198, country: "🇧🇭", langs: ["AR", "EN"], radius: "Manama 30km", ready: true, balance: 1320 },
  { name: "Khaled Al-Dosari", init: "KD", bar: "BH-6021", yrs: 6, rating: 4.71, cases: 88, country: "🇧🇭", langs: ["AR"], radius: "Riffa 20km", ready: false, balance: 480 },
  { name: "Mariam Al-Sabah", init: "MS", bar: "BH-4811", yrs: 8, rating: 4.83, cases: 167, country: "🇧🇭", langs: ["AR", "EN"], radius: "All BH", ready: true, balance: 1110 },
  { name: "Ali Al-Rashid", init: "AR", bar: "BH-5573", yrs: 5, rating: 4.66, cases: 64, country: "🇧🇭", langs: ["AR", "EN"], radius: "Isa Town 22km", ready: false, balance: 240 },
  { name: "Fatima Janahi", init: "FJ", bar: "BH-3014", yrs: 12, rating: 4.90, cases: 301, country: "🇧🇭", langs: ["AR", "EN", "UR"], radius: "All BH", ready: true, balance: 2120 },
];

export type FeedPart = string | { ref: string };

export interface FeedItem {
  ic: "red" | "green" | "gold" | "amber";
  t: FeedPart[];
  ago: string;
}

export const FEED: FeedItem[] = [
  { ic: "red", t: ["Urgent dispatch ", { ref: "LS-2026-08842" }, " — arrest at Manama Block 318. Mobilizing Sara Al-Hashimi."], ago: "2m" },
  { ic: "green", t: ["Sara Al-Hashimi accepted ", { ref: "LS-2026-08842" }, ". ETA 4 min."], ago: "2m" },
  { ic: "gold", t: [{ ref: "LS-2026-08841" }, " consultation started — Yusuf Al-Khalifa, BHD 25 captured."], ago: "6m" },
  { ic: "amber", t: ["SLA watch: ", { ref: "LS-2026-08840" }, " connect at 4:12 — above 3 min target."], ago: "8m" },
  { ic: "green", t: [{ ref: "LS-2026-08839" }, " — Layla Buhindi arrived at Bahrain International Airport."], ago: "14m" },
  { ic: "green", t: ["Payout settled · ", { ref: "PO-9912" }, " · BHD 1,320 → Layla Buhindi."], ago: "32m" },
  { ic: "amber", t: ["Lawyer Khaled Al-Dosari went off-call (shift end)."], ago: "1h" },
  { ic: "red", t: ["Case ", { ref: "LS-2026-08836" }, " flagged disputed by client."], ago: "2h" },
];

export interface NotifItem {
  ic: "red" | "green" | "gold" | "amber";
  t: string;
  ago: string;
  unread?: boolean;
}

export const NOTIFS: NotifItem[] = [
  { ic: "red", t: "Urgent: arrest case LS-2026-08842 needs review", ago: "2m", unread: true },
  { ic: "amber", t: "SLA breach — LS-2026-08840 connect 4:12 (target 3:00)", ago: "8m", unread: true },
  { ic: "red", t: "Disputed case LS-2026-08836 — client filed refund request", ago: "2h", unread: true },
  { ic: "green", t: "Payout batch PO-9912 settled (3 lawyers, BHD 4,090)", ago: "32m" },
  { ic: "gold", t: "Lawyer onboarding: Mariam Al-Sabah completed KYC", ago: "4h" },
];

// 30-day sparkline values per lawyer (revenue BHD)
export const SPARKS: Record<string, number[]> = {
  "Sara Al-Hashimi": [80, 95, 60, 110, 120, 90, 130, 140, 105, 95, 120, 150, 130, 145, 160, 130, 110, 125, 140, 155, 170, 140, 125, 135, 150, 165, 175, 160, 140, 155],
  "Yusuf Al-Khalifa": [110, 130, 105, 145, 160, 140, 170, 180, 155, 145, 165, 195, 180, 195, 210, 180, 165, 175, 190, 205, 220, 195, 175, 185, 200, 215, 230, 215, 195, 210],
  "Noor Al-Mahmood": [50, 65, 40, 75, 80, 65, 85, 95, 70, 60, 80, 100, 85, 95, 105, 85, 75, 85, 95, 105, 115, 95, 80, 90, 100, 110, 120, 105, 90, 100],
  "Layla Buhindi": [70, 85, 55, 95, 105, 80, 115, 125, 95, 85, 105, 130, 115, 130, 145, 115, 100, 110, 125, 140, 150, 125, 110, 120, 130, 145, 155, 140, 125, 135],
  "Khaled Al-Dosari": [30, 45, 25, 55, 60, 50, 65, 70, 55, 50, 65, 75, 65, 70, 80, 60, 55, 65, 70, 75, 80, 65, 55, 60, 65, 70, 75, 70, 60, 65],
  "Mariam Al-Sabah": [65, 80, 50, 90, 100, 80, 110, 120, 95, 85, 105, 125, 110, 120, 135, 110, 95, 105, 115, 130, 140, 115, 100, 110, 125, 135, 145, 130, 115, 125],
  "Ali Al-Rashid": [20, 30, 15, 40, 45, 35, 50, 55, 40, 35, 50, 60, 45, 55, 60, 45, 40, 45, 55, 60, 65, 50, 40, 50, 55, 60, 65, 55, 45, 50],
  "Fatima Janahi": [100, 120, 95, 135, 145, 125, 160, 170, 140, 130, 155, 180, 165, 175, 195, 165, 150, 165, 180, 195, 210, 180, 160, 175, 190, 205, 220, 200, 180, 195],
};

export const HISTO_DATA = [3, 6, 11, 18, 24, 32, 28, 19, 12, 7, 4, 2]; // connect time bins 0..6+ min
export const KPI_24H = { cases: 47, active: 4, lawyersOnline: 6, revenue: 4385 };

// ── Helpers ──────────────────────────────────────────────────────────

export function fmtAgo(m: number): string {
  if (m < 1) return "now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

export function fmtBHD(n: number): string {
  return n.toLocaleString("en-US");
}

export function statusColor(_s: CaseStatus | PaymentStatus): string {
  // Kept for backwards compat with any older callers; new code uses StatusPill.
  return "#d4a85a";
}
