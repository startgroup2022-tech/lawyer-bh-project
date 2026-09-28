import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const auth = vi.hoisted(() => ({ valid: true }));
const database = vi.hoisted(() => ({
  rows: [] as Array<Record<string, unknown>>,
  sqlClient: vi.fn(async () => database.rows),
}));
const googleRoutes = vi.hoisted(() => ({
  computeDrivingRoute: vi.fn(),
}));

vi.mock("@/lib/sos/mobile-dispatch-auth", () => ({
  bearerToken: vi.fn(() => "request-token"),
  authorizeMobileDispatchToken: vi.fn(async () => auth.valid),
}));

vi.mock("@/lib/db/client", () => ({ sqlClient: database.sqlClient }));
vi.mock("@/lib/sos/google-routes", () => googleRoutes);

import { GET } from "./route";

const requestId = "8d983269-123f-49a8-9b62-ccaa7a4e496e";

describe("mobile SOS request status", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-08-22T08:22:30.000Z"));
    vi.clearAllMocks();
    auth.valid = true;
    database.rows = [];
    googleRoutes.computeDrivingRoute.mockResolvedValue(null);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("tells the client when administration is arranging an on-call lawyer", async () => {
    database.rows = [{
      id: requestId, case_ref: "SOS-ADMIN", case_type: "emergency_arrest", description: null,
      payment_status: "success", service_status: "pending", base_fee_bhd: "150.000",
      workflow_type: "direct_consultation",
      created_at: new Date("2026-08-22T08:00:00Z"), location: { lat: 26.22, lng: 50.58 },
      last_advocate_location: null, candidate_lawyer_id: null, assigned_lawyer_id: null,
      customer_approved_at: null, lawyer_response_deadline: null,
      admin_escalated_at: new Date("2026-08-22T08:21:00Z"),
      candidate_name: null, assigned_name: null,
      candidate_profile_image_url: null, assigned_profile_image_url: null,
      candidate_rating: null, assigned_rating: null, candidate_specialty: null, assigned_specialty: null,
    }];
    const response = await GET(new Request(`https://www.lawyers.bh/api/mobile/sos/requests/${requestId}/status`, { headers: { authorization: "Bearer request-token" } }), { params: Promise.resolve({ requestId }) });
    const body = await response.json();
    expect(body.state).toBe("awaiting_on_call_assignment");
    expect(body.workflowType).toBe("direct_consultation");
  });

  it("rejects a token that does not belong to the requested booking", async () => {
    auth.valid = false;

    const response = await GET(
      new Request(`https://www.lawyers.bh/api/mobile/sos/requests/${requestId}/status`),
      { params: Promise.resolve({ requestId }) },
    );

    expect(response.status).toBe(401);
    expect(database.sqlClient).not.toHaveBeenCalled();
  });

  it("returns the paid request summary without customer or payment secrets", async () => {
    database.rows = [{
      id: requestId,
      case_ref: "SOS-260822-W44N",
      case_type: "emergency_arrest",
      description: "توقيف / قبض طارئ",
      payment_status: "success",
      service_status: "pending",
      base_fee_bhd: "150.000",
      created_at: new Date("2026-08-22T08:19:00.000Z"),
      location: { lat: 26.2, lng: 50.5, address: "Manama" },
      candidate_lawyer_id: "candidate-id",
      assigned_lawyer_id: null,
      customer_approved_at: null,
      lawyer_response_deadline: null,
      candidate_name: "المحامي المرشح",
      assigned_name: null,
    }];

    const response = await GET(
      new Request(`https://www.lawyers.bh/api/mobile/sos/requests/${requestId}/status`, {
        headers: { authorization: "Bearer request-token" },
      }),
      { params: Promise.resolve({ requestId }) },
    );

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body).toMatchObject({
      requestId,
      requestReference: "SOS-260822-W44N",
      caseType: "emergency_arrest",
      description: "توقيف / قبض طارئ",
      paymentStatus: "success",
      serviceStatus: "pending",
      amount: 150,
      currency: "BHD",
      createdAt: "2026-08-22T08:19:00.000Z",
      locationAddress: "Manama",
      state: "candidate_review",
      candidate: {
        id: "candidate-id",
        name: "المحامي المرشح",
        etaMinutes: null,
        distanceKm: null,
      },
    });
    expect(JSON.stringify(body)).not.toContain("contact_phone");
    expect(JSON.stringify(body)).not.toContain("tap_");
  });

  it("returns the assigned lawyer public profile from the database", async () => {
    database.rows = [{
      id: requestId,
      case_ref: "SOS-260822-W44N",
      case_type: "emergency_arrest",
      description: "توقيف / قبض طارئ",
      payment_status: "success",
      service_status: "assigned",
      base_fee_bhd: "150.000",
      created_at: new Date("2026-08-22T08:19:00.000Z"),
      location: { address: "Manama" },
      candidate_lawyer_id: "assigned-id",
      assigned_lawyer_id: "assigned-id",
      customer_approved_at: new Date("2026-08-22T08:20:00.000Z"),
      lawyer_response_deadline: new Date("2026-08-22T08:25:00.000Z"),
      candidate_name: "المحامي حبيب",
      assigned_name: "المحامي حبيب",
      assigned_profile_image_url: "https://cdn.example.com/habib.jpg",
      assigned_rating: "4.7",
      assigned_specialty: "criminal",
    }];

    const response = await GET(
      new Request(`https://www.lawyers.bh/api/mobile/sos/requests/${requestId}/status`, {
        headers: { authorization: "Bearer request-token" },
      }),
      { params: Promise.resolve({ requestId }) },
    );

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.acceptedLawyer).toEqual({
      id: "assigned-id",
      name: "المحامي حبيب",
      profileImageUrl: "https://cdn.example.com/habib.jpg",
      rating: 4.7,
      specialty: "criminal",
      etaMinutes: null,
      distanceKm: null,
      priceBhd: 150,
    });
    expect(JSON.stringify(body)).not.toContain("live_location");
  });

  it("returns authenticated real tracking coordinates and Google route while mobilizing", async () => {
    database.rows = [{
      id: requestId,
      case_ref: "SOS-260822-W44N",
      case_type: "emergency_arrest",
      description: "توقيف / قبض طارئ",
      payment_status: "success",
      service_status: "mobilizing",
      base_fee_bhd: "150.000",
      created_at: new Date("2026-08-22T08:19:00.000Z"),
      location: { lat: 26.2235, lng: 50.5876, address: "Manama" },
      last_advocate_location: {
        lat: 26.21,
        lng: 50.57,
        accuracy: 7,
        reportedAt: "2026-08-22T08:22:00.000Z",
      },
      candidate_lawyer_id: "assigned-id",
      assigned_lawyer_id: "assigned-id",
      customer_approved_at: new Date("2026-08-22T08:20:00.000Z"),
      lawyer_response_deadline: new Date("2026-08-22T08:25:00.000Z"),
      candidate_name: "المحامي حبيب",
      assigned_name: "المحامي حبيب",
    }];
    googleRoutes.computeDrivingRoute.mockResolvedValue({
      etaMinutes: 5,
      distanceKm: 3.46,
      encodedPolyline: "route-polyline",
    });

    const response = await GET(
      new Request(`https://www.lawyers.bh/api/mobile/sos/requests/${requestId}/status`, {
        headers: { authorization: "Bearer request-token" },
      }),
      { params: Promise.resolve({ requestId }) },
    );

    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({
      serviceStatus: "mobilizing",
      tracking: {
        customerLocation: { lat: 26.2235, lng: 50.5876 },
        lawyerLocation: {
          lat: 26.21,
          lng: 50.57,
          accuracy: 7,
          reportedAt: "2026-08-22T08:22:00.000Z",
        },
        etaMinutes: 5,
        distanceKm: 3.46,
        encodedPolyline: "route-polyline",
      },
    });
    expect(googleRoutes.computeDrivingRoute).toHaveBeenCalledWith(
      {
        origin: { lat: 26.21, lng: 50.57 },
        destination: { lat: 26.2235, lng: 50.5876 },
      },
      expect.objectContaining({ onFailure: expect.any(Function) }),
    );
  });

  it("does not invent route metrics when Google Routes is unavailable", async () => {
    database.rows = [{
      id: requestId,
      case_ref: "SOS-260822-W44N",
      case_type: "emergency_arrest",
      description: null,
      payment_status: "success",
      service_status: "mobilizing",
      base_fee_bhd: "150.000",
      created_at: new Date("2026-08-22T08:19:00.000Z"),
      location: { lat: 26.2235, lng: 50.5876 },
      last_advocate_location: {
        lat: 26.21,
        lng: 50.57,
        accuracy: 7,
        reportedAt: "2026-08-22T08:22:00.000Z",
      },
      candidate_lawyer_id: "assigned-id",
      assigned_lawyer_id: "assigned-id",
      customer_approved_at: new Date("2026-08-22T08:20:00.000Z"),
      lawyer_response_deadline: null,
      candidate_name: "Lawyer",
      assigned_name: "Lawyer",
    }];
    googleRoutes.computeDrivingRoute.mockResolvedValue(null);

    const response = await GET(
      new Request(`https://www.lawyers.bh/api/mobile/sos/requests/${requestId}/status`, {
        headers: { authorization: "Bearer request-token" },
      }),
      { params: Promise.resolve({ requestId }) },
    );
    const body = await response.json();

    expect(body.trackingState).toBe("calculating_route");
    expect(body.customerLocation).toEqual({ lat: 26.2235, lng: 50.5876 });
    expect(body.lawyerLocation).toMatchObject({ lat: 26.21, lng: 50.57 });
    expect(body.tracking).toBeNull();
  });

  it("returns the real last known lawyer position without presenting it as live", async () => {
    database.rows = [{
      id: requestId,
      case_ref: "SOS-260822-W44N",
      case_type: "emergency_arrest",
      description: null,
      payment_status: "success",
      service_status: "mobilizing",
      base_fee_bhd: "150.000",
      created_at: new Date("2026-08-22T06:50:00.000Z"),
      location: { lat: 26.2235, lng: 50.5876 },
      last_advocate_location: {
        lat: 26.21,
        lng: 50.57,
        accuracy: 7,
        reportedAt: "2026-08-22T07:00:00.000Z",
      },
      candidate_lawyer_id: "assigned-id",
      assigned_lawyer_id: "assigned-id",
      customer_approved_at: new Date("2026-08-22T06:55:00.000Z"),
      lawyer_response_deadline: null,
      candidate_name: "Lawyer",
      assigned_name: "Lawyer",
    }];

    const response = await GET(
      new Request(`https://www.lawyers.bh/api/mobile/sos/requests/${requestId}/status`, {
        headers: { authorization: "Bearer request-token" },
      }),
      { params: Promise.resolve({ requestId }) },
    );
    const body = await response.json();

    expect(body).toMatchObject({
      trackingState: "stale",
      customerLocation: { lat: 26.2235, lng: 50.5876 },
      lawyerLocation: {
        lat: 26.21,
        lng: 50.57,
        accuracy: 7,
        reportedAt: "2026-08-22T07:00:00.000Z",
      },
      tracking: null,
    });
    expect(googleRoutes.computeDrivingRoute).not.toHaveBeenCalled();
  });

  it("returns the customer position while waiting for the first lawyer location", async () => {
    database.rows = [{
      id: requestId,
      case_ref: "SOS-260822-W44N",
      case_type: "emergency_arrest",
      description: null,
      payment_status: "success",
      service_status: "mobilizing",
      base_fee_bhd: "150.000",
      created_at: new Date("2026-08-22T08:19:00.000Z"),
      location: { lat: 26.2235, lng: 50.5876 },
      last_advocate_location: null,
      candidate_lawyer_id: "assigned-id",
      assigned_lawyer_id: "assigned-id",
      customer_approved_at: new Date("2026-08-22T08:20:00.000Z"),
      lawyer_response_deadline: null,
      candidate_name: "Lawyer",
      assigned_name: "Lawyer",
    }];

    const response = await GET(
      new Request(`https://www.lawyers.bh/api/mobile/sos/requests/${requestId}/status`, {
        headers: { authorization: "Bearer request-token" },
      }),
      { params: Promise.resolve({ requestId }) },
    );
    const body = await response.json();

    expect(body).toMatchObject({
      trackingState: "waiting",
      customerLocation: { lat: 26.2235, lng: 50.5876 },
      lawyerLocation: null,
      tracking: null,
    });
  });

  it("does not expose stale tracking coordinates after completion", async () => {
    database.rows = [{
      id: requestId,
      case_ref: "SOS-260822-W44N",
      case_type: "emergency_arrest",
      description: null,
      payment_status: "success",
      service_status: "completed",
      base_fee_bhd: "150.000",
      created_at: new Date("2026-08-22T08:19:00.000Z"),
      location: { lat: 26.2235, lng: 50.5876 },
      last_advocate_location: {
        lat: 26.21,
        lng: 50.57,
        reportedAt: "2026-08-22T08:22:00.000Z",
      },
      candidate_lawyer_id: "assigned-id",
      assigned_lawyer_id: "assigned-id",
      customer_approved_at: new Date("2026-08-22T08:20:00.000Z"),
      lawyer_response_deadline: null,
      candidate_name: "Lawyer",
      assigned_name: "Lawyer",
    }];

    const response = await GET(
      new Request(`https://www.lawyers.bh/api/mobile/sos/requests/${requestId}/status`, {
        headers: { authorization: "Bearer request-token" },
      }),
      { params: Promise.resolve({ requestId }) },
    );

    expect((await response.json()).tracking).toBeNull();
    expect(googleRoutes.computeDrivingRoute).not.toHaveBeenCalled();
  });
});
