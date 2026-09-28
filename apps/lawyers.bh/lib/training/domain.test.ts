import { describe, expect, it } from "vitest";
import { PDFDocument } from "pdf-lib";
import { parseApplication, parseManifest, parseReview, parseFilters, validatePdf } from "./domain";

export const input = { type: "law", field: "stale", fullName: " Test Applicant ", email: " TEST@example.invalid ", phone: "+973 3333 3333", location: "Manama", university: "", qualification: "Student", specialization: "Law", startDate: "2099-10-01", durationWeeks: 8, message: "", consent: true };
describe("training validation", () => {
  it("normalizes data and removes hidden other-field data for law training", () => {
    expect(parseApplication(input)).toMatchObject({ type: "law", field: "", fullName: "Test Applicant", email: "test@example.invalid", durationWeeks: 8 });
  });
  it("requires an explicit field for other training", () => {
    expect(() => parseApplication({ ...input, type: "other", field: "" })).toThrow("invalid_field");
    expect(parseApplication({ ...input, type: "other", field: "Technology" }).field).toBe("Technology");
  });
  it.each([0, 53, 1.2, "8"])("rejects invalid duration %s", durationWeeks => expect(() => parseApplication({ ...input, durationWeeks })).toThrow("invalid_duration"));
  it.each(["2026-02-30", "2026-09-08", "bad", "2026-9-10"])("rejects invalid or past date %s", startDate => expect(() => parseApplication({ ...input, startDate }, new Date("2026-09-09T22:00:00Z"))).toThrow("invalid_date"));
  it("uses Bahrain's current date at the UTC day boundary", () => {
    expect(() => parseApplication({ ...input, startDate: "2026-09-09" }, new Date("2026-09-09T22:00:00Z"))).toThrow("invalid_date");
    expect(parseApplication({ ...input, startDate: "2026-09-10" }, new Date("2026-09-09T22:00:00Z")).startDate).toBe("2026-09-10");
  });
  it.each([{ consent: false }, { website: "bot" }, { email: "wrong" }, { phone: "-------" }, { fullName: " " }])("rejects malformed/unsolicited applications %j", patch => expect(() => parseApplication({ ...input, ...patch })).toThrow());
  it("requires CV and allows only an optional distinct university letter", () => {
    expect(parseManifest([{ kind: "cv", name: "CV.PDF", size: 100 }])).toHaveLength(1);
    expect(parseManifest([{ kind: "cv", name: "cv.pdf", size: 100 }, { kind: "university_letter", name: "letter.pdf", size: 5242880 }])).toHaveLength(2);
    for (const files of [[], [{ kind: "university_letter", name: "x.pdf", size: 100 }], [{ kind: "cv", name: "x.exe", size: 100 }], [{ kind: "cv", name: "x.pdf", size: 5242881 }], [{ kind: "cv", name: "x.pdf", size: 1 }], [{ kind: "cv", name: "x.pdf", size: 100 }, { kind: "cv", name: "x.pdf", size: 100 }]]) expect(() => parseManifest(files)).toThrow("invalid_files");
  });
  it("checks actual PDF content", async () => {
    const pdf = await PDFDocument.create(); pdf.addPage();
    await expect(validatePdf(Buffer.from(await pdf.save()))).resolves.toBeUndefined();
    await expect(validatePdf(Buffer.from("%PDF-1.7 fake document %%EOF"))).rejects.toThrow("invalid_pdf");
  });
  it("validates review version, status and archive mode", () => {
    expect(parseReview({ version: 2, status: "review", notes: " hello " })).toEqual({ version: 2, status: "review", notes: "hello" });
    expect(parseReview({ version: 2, action: "archive" })).toEqual({ version: 2, action: "archive" });
    expect(() => parseReview({ version: 0, status: "accepted" })).toThrow();
    expect(() => parseReview({ version: 1, status: "madeup" })).toThrow();
  });
  it("bounds pagination and rejects unknown filters", () => {
    expect(parseFilters({})).toEqual({ type: "", status: "", query: "", archived: false, page: 1 });
    expect(() => parseFilters({ page: "1.5" })).toThrow();
    expect(() => parseFilters({ type: "bogus" })).toThrow();
  });
});
