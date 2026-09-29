import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  session: vi.fn(),
  loadAvailability: vi.fn(),
  replaceAvailability: vi.fn(),
}));

vi.mock("server-only", () => ({}));
vi.mock("@/lib/db/client", () => ({ sqlClient: {} }));
vi.mock("@/lib/mobile-lawyer-auth", () => ({
  getMobileLawyerSession: mocks.session,
}));
vi.mock("@/lib/booking/lawyerAvailabilityStore", () => ({
  loadAvailability: mocks.loadAvailability,
  replaceAvailability: mocks.replaceAvailability,
}));

import { GET, PUT } from "./route";

const lawyer = { lawyerId: "11111111-1111-4111-8111-111111111111", countryCode: "BH" };

describe("mobile lawyer availability API", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.session.mockResolvedValue(lawyer);
  });

  it("rejects an unauthenticated caller without reading availability", async () => {
    mocks.session.mockResolvedValue(null);
    const response = await GET(new Request("https://lawyers.bh/api/mobile/lawyer/availability"));
    expect(response.status).toBe(401);
    expect(mocks.loadAvailability).not.toHaveBeenCalled();
  });

  it("serialises stored windows as HH:MM wire times", async () => {
    mocks.loadAvailability.mockResolvedValue([
      { weekday: 0, start: 540, end: 1020, slotDurationMinutes: 30, consultationType: "any" },
    ]);
    const response = await GET(new Request("https://lawyers.bh/api/mobile/lawyer/availability"));
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).toBe("no-store");
    expect(payload.availability).toEqual([
      {
        weekday: 0,
        start_time: "09:00",
        end_time: "17:00",
        slot_duration_minutes: 30,
        consultation_type: "any",
      },
    ]);
  });

  it("rejects an overlapping grid before touching the store", async () => {
    const response = await PUT(
      new Request("https://lawyers.bh/api/mobile/lawyer/availability", {
        method: "PUT",
        body: JSON.stringify({
          availability: [
            { weekday: 0, start_time: "09:00", end_time: "13:00" },
            { weekday: 0, start_time: "12:00", end_time: "15:00" },
          ],
        }),
      }),
    );

    expect(response.status).toBe(400);
    expect((await response.json()).error).toBe("invalid_range");
    expect(mocks.replaceAvailability).not.toHaveBeenCalled();
  });

  it("persists a validated grid scoped to the session's lawyer and country", async () => {
    mocks.replaceAvailability.mockResolvedValue([
      { weekday: 1, start: 540, end: 780, slotDurationMinutes: 45, consultationType: "video" },
    ]);
    const response = await PUT(
      new Request("https://lawyers.bh/api/mobile/lawyer/availability", {
        method: "PUT",
        body: JSON.stringify({
          availability: [
            {
              weekday: 1,
              start_time: "09:00",
              end_time: "13:00",
              slot_duration_minutes: 45,
              consultation_type: "video",
            },
          ],
        }),
      }),
    );

    expect(response.status).toBe(200);
    expect(mocks.replaceAvailability).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        lawyerId: lawyer.lawyerId,
        countryCode: "BH",
        windows: [
          { weekday: 1, start: 540, end: 780, slotDurationMinutes: 45, consultationType: "video" },
        ],
      }),
    );
  });
});
