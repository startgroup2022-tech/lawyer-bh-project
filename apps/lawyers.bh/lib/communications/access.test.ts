import { describe, expect, it, vi } from "vitest";

import {
  resolveCommunicationParticipant,
  type CommunicationRequestAccessRow,
} from "./access";

const requestId = "8d983269-123f-49a8-9b62-ccaa7a4e496e";
const assignedLawyerId = "11111111-1111-4111-8111-111111111111";

function row(
  overrides: Partial<CommunicationRequestAccessRow> = {},
): CommunicationRequestAccessRow {
  return {
    requestId,
    clientId: "client:8d983269-123f-49a8-9b62-ccaa7a4e496e",
    clientAccountId: "33333333-3333-4333-8333-333333333333",
    clientDisplayName: "Client",
    clientPhone: "+97336000000",
    mobileRequestAccessDigest: "stored-digest",
    assignedLawyerId,
    assignedLawyerDisplayName: "Assigned Lawyer",
    assignedLawyerPhone: "+97339000000",
    serviceStatus: "mobilizing",
    ...overrides,
  };
}

function dependencies(accessRow: CommunicationRequestAccessRow | null = row()) {
  return {
    findRequest: vi.fn(async () => accessRow),
    verifyClientToken: vi.fn(
      (token: string, digest: string) =>
        token === "client-token" && digest === "stored-digest",
    ),
  };
}

describe("accepted request communication access", () => {
  it("allows the request client to read, send, and call after acceptance", async () => {
    const deps = dependencies();

    const participant = await resolveCommunicationParticipant(
      { requestId, credential: { kind: "client", token: "client-token" } },
      deps,
    );

    expect(participant).toEqual({
      requestId,
      actor: {
        role: "client",
        id: "client:8d983269-123f-49a8-9b62-ccaa7a4e496e",
        accountId: "33333333-3333-4333-8333-333333333333",
      },
      peer: {
        role: "lawyer",
        id: assignedLawyerId,
        accountId: assignedLawyerId,
        displayName: "Assigned Lawyer",
        phone: "+97339000000",
      },
      capabilities: { read: true, send: true, call: true },
    });
  });

  it("allows only the lawyer assigned to the accepted request", async () => {
    const deps = dependencies();

    const assigned = await resolveCommunicationParticipant(
      {
        requestId,
        credential: {
          kind: "lawyer",
          lawyerId: assignedLawyerId,
          countryCode: "BH",
        },
      },
      deps,
    );
    const anotherLawyer = await resolveCommunicationParticipant(
      {
        requestId,
        credential: {
          kind: "lawyer",
          lawyerId: "22222222-2222-4222-8222-222222222222",
          countryCode: "BH",
        },
      },
      deps,
    );

    expect(assigned).toMatchObject({
      actor: { role: "lawyer", id: assignedLawyerId },
      peer: {
        role: "client",
        id: "client:8d983269-123f-49a8-9b62-ccaa7a4e496e",
        accountId: "33333333-3333-4333-8333-333333333333",
        displayName: "Client",
        phone: "+97336000000",
      },
      capabilities: { read: true, send: true, call: true },
    });
    expect(anotherLawyer).toBeNull();
  });

  it("rejects a client token that does not belong to the request", async () => {
    const deps = dependencies();

    const participant = await resolveCommunicationParticipant(
      { requestId, credential: { kind: "client", token: "wrong-token" } },
      deps,
    );

    expect(participant).toBeNull();
  });

  it.each([
    ["pending", null],
    ["pending", assignedLawyerId],
    ["cancelled", assignedLawyerId],
    ["disputed", assignedLawyerId],
  ] as const)(
    "denies communication while status is %s and assignment is %s",
    async (serviceStatus, lawyerId) => {
      const deps = dependencies(
        row({ serviceStatus, assignedLawyerId: lawyerId }),
      );

      const participant = await resolveCommunicationParticipant(
        { requestId, credential: { kind: "client", token: "client-token" } },
        deps,
      );

      expect(participant).toBeNull();
    },
  );

  it("keeps completed history read-only", async () => {
    const deps = dependencies(row({ serviceStatus: "completed" }));

    const participant = await resolveCommunicationParticipant(
      { requestId, credential: { kind: "client", token: "client-token" } },
      deps,
    );

    expect(participant?.capabilities).toEqual({
      read: true,
      send: false,
      call: false,
    });
  });

  it("does not authorize a missing request", async () => {
    const deps = dependencies(null);

    const participant = await resolveCommunicationParticipant(
      { requestId, credential: { kind: "client", token: "client-token" } },
      deps,
    );

    expect(participant).toBeNull();
  });
});
