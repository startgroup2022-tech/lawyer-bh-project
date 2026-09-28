import { describe, expect, it } from "vitest";

import {
  canChangeCandidate,
  isLiveLocationFresh,
  rankEligibleCandidates,
  responseDeadline,
  serializeExcludedLawyerIds,
  serializeDispatchTimestamp,
  validateCoordinates,
  type DispatchCandidate,
} from "./live-dispatch";

const now = new Date("2026-08-12T12:00:00.000Z");

function candidate(
  overrides: Partial<DispatchCandidate> = {},
): DispatchCandidate {
  return {
    id: "lawyer-1",
    name: "Lawyer One",
    profileImageUrl: null,
    rating: 4.8,
    specialty: "criminal",
    latitude: 26.2235,
    longitude: 50.5876,
    liveLocationUpdatedAt: new Date("2026-08-12T11:59:00.000Z"),
    emergencyRadiusKm: 20,
    priceBhd: 150,
    isActive: true,
    isApproved: true,
    suspensionType: null,
    isEmergencyReady: true,
    locationSharingEnabled: true,
    experienceYears: 8,
    language: "Arabic",
    subscriptionTypes: ["lawyer", "consultant"],
    memberSince: new Date("2024-03-01T00:00:00.000Z"),
    ...overrides,
  };
}

describe("live lawyer dispatch rules", () => {
  it("requires a fresh location while availability remains enabled", () => {
    const saved = candidate({
      liveLocationUpdatedAt: new Date("2026-07-01T12:00:00.000Z"),
      latitude: 26.2235,
      longitude: 50.5876,
    });
    const select = (entry: DispatchCandidate) => rankEligibleCandidates({
      customerLocation: { lat: 26.2235, lng: 50.5876 },
      now,
      excludedLawyerIds: new Set(),
      candidates: [entry],
    });
    expect(select(saved)).toEqual([]);
    expect(select(candidate())).toMatchObject([{ id: "lawyer-1", distanceKm: 0 }]);
    expect(select({ ...saved, isEmergencyReady: false })).toEqual([]);
    expect(select({ ...saved, locationSharingEnabled: false })).toEqual([]);
    expect(select({ ...saved, isApproved: false })).toEqual([]);
    expect(select({ ...saved, isActive: false })).toEqual([]);
    expect(select({ ...saved, suspensionType: "temporary" })).toEqual([]);
  });

  it("does not require Tap payout onboarding for dispatch", () => {
    const result = rankEligibleCandidates({
      customerLocation: { lat: 26.2235, lng: 50.5876 },
      now,
      excludedLawyerIds: new Set(),
      candidates: [candidate()],
    });

    expect(result).toMatchObject([{ id: "lawyer-1", distanceKm: 0 }]);
  });

  it("keeps public professional profile fields on the selected candidate", () => {
    const result = rankEligibleCandidates({
      customerLocation: { lat: 26.2235, lng: 50.5876 },
      now,
      excludedLawyerIds: new Set(),
      candidates: [candidate()],
    });

    expect(result[0]).toMatchObject({
      experienceYears: 8,
      language: "Arabic",
      subscriptionTypes: ["lawyer", "consultant"],
      memberSince: new Date("2024-03-01T00:00:00.000Z"),
      verified: true,
    });
  });

  it("rejects coordinates outside valid latitude and longitude ranges", () => {
    expect(() => validateCoordinates({ latitude: 91, longitude: 50 })).toThrow(
      "invalid_coordinates",
    );
    expect(() => validateCoordinates({ latitude: 26, longitude: -181 })).toThrow(
      "invalid_coordinates",
    );
    expect(validateCoordinates({ latitude: 26.2, longitude: 50.5 })).toEqual({
      lat: 26.2,
      lng: 50.5,
    });
  });

  it("treats a location as stale at exactly five minutes", () => {
    expect(
      isLiveLocationFresh(
        new Date("2026-08-12T11:55:00.001Z"),
        now,
      ),
    ).toBe(true);
    expect(
      isLiveLocationFresh(
        new Date("2026-08-12T11:55:00.000Z"),
        now,
      ),
    ).toBe(false);
  });

  it("accepts the ISO timestamp shape returned by the production database", () => {
    expect(
      isLiveLocationFresh(
        "2026-08-12T11:59:00.000Z" as unknown as Date,
        now,
      ),
    ).toBe(true);
  });

  it("returns only eligible non-excluded lawyers ordered by live distance", () => {
    const result = rankEligibleCandidates({
      customerLocation: { lat: 26.2235, lng: 50.5876 },
      now,
      excludedLawyerIds: new Set(["excluded"]),
      candidates: [
        candidate({ id: "far", latitude: 26.25, longitude: 50.60 }),
        candidate({ id: "near", latitude: 26.224, longitude: 50.588 }),
        candidate({ id: "excluded" }),
        candidate({ id: "inactive", isActive: false }),
        candidate({ id: "unapproved", isApproved: false }),
        candidate({ id: "suspended", suspensionType: "temporary" }),
        candidate({ id: "offline", isEmergencyReady: false }),
        candidate({ id: "not-sharing", locationSharingEnabled: false }),
        candidate({
          id: "stale",
          liveLocationUpdatedAt: new Date("2026-08-12T11:55:00.000Z"),
        }),
        candidate({
          id: "outside-radius",
          latitude: 26.50,
          longitude: 50.80,
          emergencyRadiusKm: 1,
        }),
      ],
    });

    expect(result.map((entry) => entry.id)).toEqual(["near", "far"]);
    expect(result[0]?.distanceKm).toBeLessThan(result[1]?.distanceKm ?? 0);
    expect(result[0]?.specialty).toBe("criminal");
  });

  it("prefers an in-radius lawyer before a closer out-of-radius lawyer", () => {
    const result = rankEligibleCandidates({
      customerLocation: { lat: 26.2235, lng: 50.5876 },
      now,
      excludedLawyerIds: new Set(),
      candidates: [
        candidate({
          id: "closer-outside-radius",
          latitude: 26.224,
          longitude: 50.588,
          emergencyRadiusKm: 0.01,
        }),
        candidate({
          id: "farther-inside-radius",
          latitude: 26.25,
          longitude: 50.60,
          emergencyRadiusKm: 20,
        }),
      ],
    });

    expect(result.map((entry) => entry.id)).toEqual([
      "farther-inside-radius",
    ]);
  });

  it("falls back to the nearest eligible lawyer when every lawyer is outside radius", () => {
    const result = rankEligibleCandidates({
      customerLocation: { lat: 26.2235, lng: 50.5876 },
      now,
      excludedLawyerIds: new Set(["excluded"]),
      candidates: [
        candidate({
          id: "far",
          latitude: 26.50,
          longitude: 50.80,
          emergencyRadiusKm: 1,
        }),
        candidate({
          id: "near",
          latitude: 26.25,
          longitude: 50.60,
          emergencyRadiusKm: 1,
        }),
        candidate({ id: "excluded", emergencyRadiusKm: 0 }),
        candidate({ id: "inactive", isActive: false, emergencyRadiusKm: 0 }),
        candidate({
          id: "stale",
          emergencyRadiusKm: 0,
          latitude: 26.224,
          liveLocationUpdatedAt: new Date("2026-08-12T11:55:00.000Z"),
        }),
      ],
    });

    expect(result.map((entry) => entry.id)).toEqual(["near", "far"]);
    expect(result[0]?.distanceKm).toBeLessThan(result[1]?.distanceKm ?? 0);
  });

  it("uses a five-minute response deadline and enables change on expiry or rejection", () => {
    const deadline = responseDeadline(now);

    expect(deadline.toISOString()).toBe("2026-08-12T12:05:00.000Z");
    expect(
      canChangeCandidate(
        deadline,
        new Date("2026-08-12T12:04:59.999Z"),
        false,
      ),
    ).toBe(false);
    expect(canChangeCandidate(deadline, deadline, false)).toBe(true);
    expect(canChangeCandidate(deadline, now, true)).toBe(true);
  });

  it("serializes excluded lawyer IDs as JSON text for postgres parameters", () => {
    expect(serializeExcludedLawyerIds(["lawyer-1", "lawyer-2"])).toBe(
      '["lawyer-1","lawyer-2"]',
    );
    expect(serializeExcludedLawyerIds([])).toBe("[]");
  });

  it("serializes dispatch timestamps as ISO text for postgres parameters", () => {
    expect(serializeDispatchTimestamp(now)).toBe("2026-08-12T12:00:00.000Z");
  });
});
