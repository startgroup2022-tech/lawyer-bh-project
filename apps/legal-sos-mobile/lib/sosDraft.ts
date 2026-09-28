// Module-scoped state for the in-flight SOS request. Screens write
// to this as the client moves through the flow (select-emergency →
// location → kyc → consent → signature → submit). On submit, this
// is reset and the resulting caseRef is persisted to SecureStore.
//
// We avoid a heavy state library while the app is mockup-stage. If
// state needs to survive app restart later, back this with SecureStore
// using `JSON.stringify` of the draft.

import type { CaseSlug } from "../constants/caseTypes";

export interface SosLocation {
  lat: number;
  lng: number;
  accuracy?: number;
  /** Human-readable address (reverse-geocoded). */
  address?: string;
  /** True when user typed the address manually instead of using GPS. */
  manual?: boolean;
}

export interface SosKyc {
  fullName: string;
  idType: "cpr" | "residence" | "passport";
  idNumber: string;
  phone: string;
  description?: string;
}

export type ConsultationLanguage = "en" | "ar";

export interface SosDraft {
  caseSlug?: CaseSlug;
  location?: SosLocation;
  kyc?: Partial<SosKyc>;
  /** Language the consultation should be conducted in. */
  language?: ConsultationLanguage;
  /** True once the user ticked the booking-consent checkbox. */
  bookingConsented?: boolean;
  /** Base64 PNG dataURL from the signature pad. */
  signatureDataUrl?: string;
  /** ISO timestamp the user ticked "I agree". */
  agreedAtClient?: string;
}

type Listener = (draft: SosDraft) => void;

let _draft: SosDraft = {};
const _listeners = new Set<Listener>();

export function getDraft(): SosDraft {
  return _draft;
}

export function updateDraft(patch: Partial<SosDraft>): SosDraft {
  _draft = { ..._draft, ...patch };
  for (const l of _listeners) l(_draft);
  return _draft;
}

export function resetDraft(): void {
  _draft = {};
  for (const l of _listeners) l(_draft);
}

export function subscribeDraft(listener: Listener): () => void {
  _listeners.add(listener);
  return () => _listeners.delete(listener);
}
