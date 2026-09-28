import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const route = readFileSync(resolve(process.cwd(), "app/api/join/route.ts"), "utf8");
const content = readFileSync(
  resolve(process.cwd(), "app/[locale]/join/Content.tsx"),
  "utf8",
);

describe("join server validation contract", () => {
  it("keeps every uploaded registration artifact and signature required", () => {
    expect(route).toContain('fd.get("licenseNumber")');
    expect(route).toContain('fd.get("profileImage")');
    expect(route).toContain('fd.get("licenseFile")');
    expect(route).toContain('fd.get("personalIdFile")');
    expect(route).toContain('fd.get("ibanCertificateFile")');
    expect(route).toContain('fd.get("signatureDataUrl")');
    expect(route).toContain("Profile image is required");
    expect(route).toContain("License file is required");
    expect(route).toContain("Personal ID file is required");
    expect(route).toContain("IBAN certificate is required");
    expect(route).toContain("Signature is required");
  });

  it("returns a stable error when the combined identifier is missing", () => {
    expect(route).toContain('error: "license_or_personal_number_required"');
  });

  it("maps the known identifier error to step 3 without exposing raw server text", () => {
    expect(content).toContain('data.error === "license_or_personal_number_required"');
    expect(content).toContain('"يرجى إدخال رقم الرخصة أو الرقم الشخصي"');
    expect(content).toContain('"Please enter the license number or personal number"');
    expect(content).toContain("setRegisterStep(3)");
    expect(content).toContain('scheduleJoinFieldFocus("licenseNumber")');
    expect(content).not.toContain(
      'setSubmitError(err instanceof Error ? err.message : "Unknown error")',
    );
  });
});
