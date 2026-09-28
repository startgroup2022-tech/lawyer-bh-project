import assert from "node:assert/strict";
import test from "node:test";

const cases = [
  {
    name: "Bahrain",
    url: process.env.TAB_BH_URL ?? "http://localhost:3000/ar",
    expectedTitle: "منصة محامون البحرين",
  },
  {
    name: "Saudi",
    url: process.env.TAB_KSA_URL ?? "http://localhost:3003/ar",
    expectedTitle: "منصة محامون السعودية",
  },
];

for (const { name, url, expectedTitle } of cases) {
  test(`${name} exposes the Arabic platform name in the browser tab`, async () => {
    const response = await fetch(url);
    assert.equal(response.status, 200);

    const html = await response.text();
    const title = html.match(/<title>([^<]*)<\/title>/)?.[1];

    assert.equal(title, expectedTitle);
  });
}
