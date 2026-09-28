import { describe, expect, it } from "vitest";
import {
  serializeInvitationSpecialties,
  serializeInvitationTimestamps,
} from "./lawyer-invitation-db";

describe("lawyer invitation database values", () => {
  it("serializes specialty arrays before binding them to postgres", () => {
    const values = serializeInvitationSpecialties("civil", ["commercial", "labor"]);

    expect(values).toEqual({
      specialtySubsJson: '["commercial","labor"]',
      specialtiesJson: '{"main":"civil","subs":["commercial","labor"]}',
    });
    expect(Array.isArray(values.specialtySubsJson)).toBe(false);
  });

  it("serializes Date objects before binding them to postgres", () => {
    const values = serializeInvitationTimestamps(
      new Date("2026-08-19T12:51:09.735Z"),
      new Date("2026-09-02T12:51:09.735Z"),
    );

    expect(values).toEqual({
      invitedAtIso: "2026-08-19T12:51:09.735Z",
      inviteTokenExpiresAtIso: "2026-09-02T12:51:09.735Z",
    });
    expect(values.invitedAtIso).not.toBeInstanceOf(Date);
  });
});
