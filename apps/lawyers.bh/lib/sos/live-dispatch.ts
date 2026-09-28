import { haversineKm } from "./distance";

export const LIVE_LOCATION_MAX_AGE_MS = 5 * 60 * 1000;
export const LAWYER_RESPONSE_WINDOW_MS = 5 * 60 * 1000;

export interface DispatchCandidate {
  id: string;
  name: string;
  profileImageUrl: string | null;
  rating: number | null;
  specialty: string | null;
  latitude: number;
  longitude: number;
  liveLocationUpdatedAt: Date;
  emergencyRadiusKm: number;
  priceBhd: number;
  isActive: boolean;
  isApproved: boolean;
  suspensionType: string | null;
  isEmergencyReady: boolean;
  locationSharingEnabled: boolean;
  experienceYears?: number;
  language?: string;
  subscriptionTypes?: string[];
  memberSince?: Date;
}

export interface RankedCandidate {
  id: string;
  name: string;
  profileImageUrl: string | null;
  rating: number | null;
  specialty: string | null;
  distanceKm: number;
  priceBhd: number;
  experienceYears?: number;
  language?: string;
  subscriptionTypes?: string[];
  memberSince?: Date;
  verified: boolean;
}

export function validateCoordinates(input: {
  latitude: number;
  longitude: number;
}): { lat: number; lng: number } {
  if (
    !Number.isFinite(input.latitude) ||
    !Number.isFinite(input.longitude) ||
    input.latitude < -90 ||
    input.latitude > 90 ||
    input.longitude < -180 ||
    input.longitude > 180
  ) {
    throw new Error("invalid_coordinates");
  }

  return { lat: input.latitude, lng: input.longitude };
}

export function isLiveLocationFresh(
  updatedAt: Date | string,
  now: Date,
  maxAgeMs = LIVE_LOCATION_MAX_AGE_MS,
): boolean {
  const updatedAtMs = updatedAt instanceof Date
    ? updatedAt.getTime()
    : Date.parse(updatedAt);
  if (!Number.isFinite(updatedAtMs)) return false;
  const ageMs = now.getTime() - updatedAtMs;
  return ageMs >= 0 && ageMs < maxAgeMs;
}

export function rankEligibleCandidates(input: {
  customerLocation: { lat: number; lng: number };
  candidates: DispatchCandidate[];
  excludedLawyerIds: ReadonlySet<string>;
  now: Date;
}): RankedCandidate[] {
  const eligibleCandidates = input.candidates
    .flatMap((candidate) => {
      if (
        input.excludedLawyerIds.has(candidate.id) ||
        !candidate.isActive ||
        !candidate.isApproved ||
        candidate.suspensionType !== null ||
        !candidate.isEmergencyReady ||
        !candidate.locationSharingEnabled ||
        !isLiveLocationFresh(candidate.liveLocationUpdatedAt, input.now)
      ) {
        return [];
      }

      const distanceKm = haversineKm(input.customerLocation, {
        lat: candidate.latitude,
        lng: candidate.longitude,
      });

      return [
        {
          id: candidate.id,
          name: candidate.name,
          profileImageUrl: candidate.profileImageUrl,
          rating: candidate.rating,
          specialty: candidate.specialty,
          distanceKm,
          priceBhd: candidate.priceBhd,
          experienceYears: candidate.experienceYears,
          language: candidate.language,
          subscriptionTypes: candidate.subscriptionTypes,
          memberSince: candidate.memberSince,
          verified: candidate.isApproved,
          withinRadius: distanceKm <= candidate.emergencyRadiusKm,
        },
      ];
    })
    .sort((first, second) => first.distanceKm - second.distanceKm);

  const inRadiusCandidates = eligibleCandidates.filter(
    (candidate) => candidate.withinRadius,
  );
  const rankedCandidates =
    inRadiusCandidates.length > 0 ? inRadiusCandidates : eligibleCandidates;

  return rankedCandidates.map((candidate) => ({
    id: candidate.id,
    name: candidate.name,
    profileImageUrl: candidate.profileImageUrl,
    rating: candidate.rating,
    specialty: candidate.specialty,
    distanceKm: candidate.distanceKm,
    priceBhd: candidate.priceBhd,
    experienceYears: candidate.experienceYears,
    language: candidate.language,
    subscriptionTypes: candidate.subscriptionTypes,
    memberSince: candidate.memberSince,
    verified: candidate.verified,
  }));
}

export function responseDeadline(approvedAt: Date): Date {
  return new Date(approvedAt.getTime() + LAWYER_RESPONSE_WINDOW_MS);
}

export function serializeExcludedLawyerIds(ids: readonly string[]): string {
  return JSON.stringify(ids);
}

export function serializeDispatchTimestamp(value: Date): string {
  return value.toISOString();
}

export function canChangeCandidate(
  deadline: Date | null,
  now: Date,
  rejected: boolean,
): boolean {
  return rejected || deadline === null || now.getTime() >= deadline.getTime();
}
