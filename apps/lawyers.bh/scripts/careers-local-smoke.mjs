// End-to-end HTTP checks against the local preview server only.
import assert from "node:assert/strict";
import { PDFDocument } from "pdf-lib";
const origin = "http://localhost:3014";
const timestamp = Date.now();
async function request(path, init = {}) {
  const response = await fetch(`${origin}${path}`, { ...init, headers: { Origin: origin, ...init.headers }, signal: AbortSignal.timeout(120000) });
  return response;
}
async function json(path, body, cookie, method = "POST") {
  const response = await request(path, { method, headers: { "Content-Type": "application/json", ...(cookie ? { Cookie: cookie } : {}) }, body: JSON.stringify(body) });
  const result = await response.json(); assert.equal(response.ok, true, JSON.stringify(result)); return result;
}
const login = await request("/api/admin-login", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email: "careers@example.invalid", password: "Careers-Preview-Only-2026!" }) });
assert.equal(login.status, 200); const cookie = login.headers.get("set-cookie").split(";")[0];
const input = { titleAr: "وظيفة اختبار الطلب الكامل", titleEn: "HTTP lifecycle test", descriptionAr: "اختبار محلي فقط", descriptionEn: "Local smoke test only", requirementsAr: "للمراجعة المحلية", requirementsEn: "Local QA", country: "BH", cityAr: "المنامة", cityEn: "Manama", employmentType: "FULL_TIME", workMode: "onsite", salary: "", closesAt: "2030-12-31T20:59:59.999Z", status: "published" };
const { job } = await json("/api/admin/careers/jobs", input, cookie);
console.log("Admin job creation: passed");
const doc = await PDFDocument.create(); doc.addPage(); const small = Buffer.from(await doc.save());
const pdf = Buffer.concat([small, Buffer.alloc(5 * 1024 * 1024 - small.length - 6, 32), Buffer.from("\n%%EOF")]);
const { token } = await json("/api/careers/applications", { jobId: job.id, fullName: "متقدم تجريبي محلي", email: `local-${timestamp}@example.invalid`, phone: "+97333333333", location: "المنامة", qualification: "بكالوريوس قانون", yearsExperience: 4, message: "طلب تجريبي فقط", consent: true, website: "", cvName: "cv.pdf", cvSize: pdf.length });
for (let offset = 0; offset < pdf.length; offset += 1024 * 1024) {
  const response = await request(`/api/careers/applications/${token}?offset=${offset}`, { method: "PUT", headers: { "Content-Type": "application/octet-stream" }, body: pdf.subarray(offset, offset + 1024 * 1024) });
  assert.equal(response.status, 200);
}
const { id } = await json(`/api/careers/applications/${token}`, {});
assert.equal((await json(`/api/careers/applications/${token}`, {})).id, id);
console.log("5 MiB chunk upload and idempotent submission: passed");
const cvPath = `/api/admin/careers/applications/${id}/cv`;
assert.equal((await request(cvPath)).status, 403);
const download = await request(cvPath, { headers: { Cookie: cookie } });
assert.match(download.headers.get("cache-control"), /no-store/);
assert.match(download.headers.get("content-disposition"), /attachment/);
assert.equal(Buffer.from(await download.arrayBuffer()).equals(pdf), true);
await json(`/api/admin/careers/applications/${id}`, { version: 1, status: "interview", notes: "مقابلة تجريبية محلية" }, cookie, "PATCH");
const list = await request(`/api/admin/careers/applications?jobId=${job.id}&status=interview`, { headers: { Cookie: cookie } });
const listed = await list.json(); assert.equal(listed.applications[0].id, id); assert.equal("cv" in listed.applications[0], false);
console.log("Private download, byte equality and applicant review: passed");
await json(`/api/admin/careers/jobs/${job.id}`, { ...job, status: "archived" }, cookie, "PATCH");
const detail = await request(`/ar/careers/${job.slug}`); assert.equal(detail.status, 404);
console.log("Archived job removed from public detail: passed");
