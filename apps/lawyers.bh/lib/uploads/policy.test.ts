import { describe, expect, it } from "vitest";
import { parseManifest } from "./policy";

const pdf = {
  field: "licenseFile",
  name: "license.pdf",
  type: "application/pdf",
  size: 5242880,
};
describe("direct upload manifest", () => {
  it("accepts a 5 MiB document above the function limit", () => {
    expect(parseManifest("join", [pdf])).toEqual([pdf]);
  });
  it.each([
    [{ ...pdf, size: 5242881 }],
    [{ ...pdf, size: 0 }],
    [{ ...pdf, size: 1.5 }],
    [pdf, pdf],
    [{ ...pdf, field: "password" }],
    [{ ...pdf, type: "image/svg+xml" }],
    [{ ...pdf, name: "../license.pdf" }],
    [{ ...pdf, field: "profileImage", type: "image/png" }],
  ])("rejects unsafe or oversized manifests %j", (...items) => {
    expect(() => parseManifest("join", items)).toThrow();
  });
  it("isolates import fields from public uploads", () => {
    const sheet = {
      field: "file",
      name: "lawyers.xlsx",
      type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      size: 5242880,
    };
    expect(parseManifest("import", [sheet])).toEqual([sheet]);
    expect(() => parseManifest("join", [sheet])).toThrow();
    expect(() => parseManifest("unknown", [pdf])).toThrow();
  });
  it("normalizes missing document MIME from extension", () => {
    expect(parseManifest("join", [{ ...pdf, type: "" }])[0].type).toBe(
      "application/pdf",
    );
  });
});
