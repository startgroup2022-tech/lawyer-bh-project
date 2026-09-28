import { describe, expect, it } from "vitest";
import {
  diffSensitiveProfileValues,
  hasProfileChanges,
  mergePendingProfileValues,
} from "./profile-change-policy";

describe("provider profile change policy", () => {
  const approved = {
    fullNameAr: "أحمد علي",
    fullNameEn: "Ahmed Ali",
    subscriptionTypes: ["lawyer"],
    registrationNo: "1234",
    registrationLevel: "practicing_lawyer",
    ibanNumber: "BH67BMAG00001299123456",
    licenseExpiryDate: "2030-12-31",
    crNumber: "90001",
  } as const;

  it("omits normalized values that match the approved profile", () => {
    expect(
      diffSensitiveProfileValues(approved, {
        fullNameAr: "  أحمد علي  ",
        fullNameEn: " Ahmed Ali ",
        subscriptionTypes: ["lawyer", "lawyer"],
        ibanNumber: "bh67 bmag 0000 1299 1234 56",
      }),
    ).toEqual({});
  });

  it("retains only allowed sensitive differences", () => {
    expect(
      diffSensitiveProfileValues(approved, {
        fullNameEn: "Ahmed A. Ali",
        ibanNumber: "BH02BBKU00000076000101",
        unsafe: "ignore me",
      } as never),
    ).toEqual({
      fullNameEn: "Ahmed A. Ali",
      ibanNumber: "BH02BBKU00000076000101",
    });
  });

  it("removes a pending proposal when a patch restores the approved value", () => {
    expect(
      mergePendingProfileValues(
        approved,
        { fullNameEn: "Pending Name", ibanNumber: "BH02BBKU00000076000101" },
        { fullNameEn: "Ahmed Ali" },
      ),
    ).toEqual({ ibanNumber: "BH02BBKU00000076000101" });
  });

  it("detects whether scalar or file proposals remain", () => {
    expect(hasProfileChanges({}, [])).toBe(false);
    expect(hasProfileChanges({ fullNameAr: "اسم جديد" }, [])).toBe(true);
    expect(hasProfileChanges({}, ["profile"])).toBe(true);
  });
});
