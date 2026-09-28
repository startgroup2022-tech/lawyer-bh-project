import {beforeEach, expect, it, vi} from "vitest";
const load = vi.hoisted(() => vi.fn());
vi.mock("@/lib/terms-management/service", () => ({getPublishedTerms: load}));
import {GET} from "./route";
beforeEach(() => load.mockReset());
it("serves the isolated app lawyer agreement, not website commission terms", async () => {
  load.mockResolvedValue({id:"agreement1", version:1, contentAr:"اتفاقية المحامي", contentEn:"Lawyer agreement"});
  const response = await GET(new Request("http://local/?locale=ar"), {params:Promise.resolve({document:"lawyer-agreement"})});
  expect(response.status).toBe(200);
  expect(load).toHaveBeenCalledWith("legalsos_lawyer_agreement", {countryCode:"BH"});
  expect((await response.json()).content).toBe("اتفاقية المحامي");
});
it("loads the Saudi lawyer agreement without falling back to Bahrain", async () => {
  load.mockResolvedValue({id:"agreement-sa", countryCode:"SA", version:1, contentAr:"اتفاقية السعودية", contentEn:"Saudi agreement"});
  const response = await GET(new Request("http://local/?locale=ar&countryCode=SA"), {params:Promise.resolve({document:"lawyer-agreement"})});
  expect(response.status).toBe(200);
  expect(load).toHaveBeenCalledWith("legalsos_lawyer_agreement", {countryCode:"SA"});
  expect((await response.json()).content).toBe("اتفاقية السعودية");
});
it("rejects invalid agreement country codes", async () => {
  const response = await GET(new Request("http://local/?countryCode=BHR"), {params:Promise.resolve({document:"lawyer-agreement"})});
  expect(response.status).toBe(400);
  expect(load).not.toHaveBeenCalled();
});
it("returns the Arabic published privacy content and never queries registration commissions", async () => {
  load.mockResolvedValue({id:"v1", version:1, contentAr:"خصوصية",contentEn:"Privacy"});
  const response = await GET(new Request("http://local/api/mobile/legal-documents/privacy?locale=ar"), {params:Promise.resolve({document:"privacy"})});
  expect(load).toHaveBeenCalledWith("legalsos_privacy");
  expect(await response.json()).toEqual({content:"خصوصية",version:1,id:"v1"});
});
it("does not expose unpublished content or unknown documents", async () => {
  load.mockResolvedValue(null);
  expect((await GET(new Request("http://local/"), {params:Promise.resolve({document:"terms"})})).status).toBe(503);
  expect((await GET(new Request("http://local/"), {params:Promise.resolve({document:"lawyer_registration"})})).status).toBe(404);
  expect(load).toHaveBeenCalledTimes(1);
});
