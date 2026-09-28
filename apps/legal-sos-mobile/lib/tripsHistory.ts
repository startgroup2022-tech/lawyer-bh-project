// Local trips history backed by SecureStore. Every completed flow
// (consultation or field) writes a row here so the user can see what
// happened on their device. Migrates to a backend `/api/sos/cases`
// list once we wire dispatch.

import * as SecureStore from "expo-secure-store";
import type { CaseSlug, Fulfillment } from "../constants/caseTypes";
import type { ConsultationLanguage } from "./sosDraft";

const KEY = "legalsos.tripsHistory";
const MAX_TRIPS = 50;

export type TripStatus = "completed" | "cancelled" | "in_progress";

export interface Trip {
  /** Local-only id (random short string) — replace with backend caseRef later. */
  id: string;
  caseSlug: CaseSlug;
  fulfillment: Fulfillment;
  caseLabel: string;
  baseFeeBhd: number;
  /** Lawyer's name if assigned (mock data while no backend). */
  lawyerName?: string;
  language?: ConsultationLanguage;
  locationAddress?: string;
  status: TripStatus;
  ratingStars?: number;
  ratingComment?: string;
  /** ISO timestamp the trip was created on the device. */
  createdAt: string;
}

function makeId(): string {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let s = "";
  for (let i = 0; i < 8; i++) s += alphabet[Math.floor(Math.random() * alphabet.length)];
  return s;
}

async function readAll(): Promise<Trip[]> {
  try {
    const raw = await SecureStore.getItemAsync(KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as Trip[]) : [];
  } catch {
    return [];
  }
}

async function writeAll(trips: Trip[]): Promise<void> {
  try {
    const trimmed = trips.slice(0, MAX_TRIPS);
    await SecureStore.setItemAsync(KEY, JSON.stringify(trimmed));
  } catch {
    // SecureStore can fail silently on simulators; ignore.
  }
}

export async function listTrips(): Promise<Trip[]> {
  const all = await readAll();
  return all.sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
}

/** Add a new trip. Returns the inserted row (with id + createdAt set). */
export async function addTrip(
  partial: Omit<Trip, "id" | "createdAt"> & { createdAt?: string },
): Promise<Trip> {
  const trip: Trip = {
    id: makeId(),
    createdAt: partial.createdAt ?? new Date().toISOString(),
    ...partial,
  };
  const all = await readAll();
  all.unshift(trip);
  await writeAll(all);
  return trip;
}

/** Update an existing trip by id (e.g. attach a rating after submission). */
export async function updateTrip(
  id: string,
  patch: Partial<Trip>,
): Promise<Trip | null> {
  const all = await readAll();
  const idx = all.findIndex((t) => t.id === id);
  if (idx === -1) return null;
  all[idx] = { ...all[idx], ...patch };
  await writeAll(all);
  return all[idx];
}

export async function clearAllTrips(): Promise<void> {
  try {
    await SecureStore.deleteItemAsync(KEY);
  } catch {
    // ignore
  }
}
