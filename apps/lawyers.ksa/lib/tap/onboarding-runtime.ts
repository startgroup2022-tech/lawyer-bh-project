import "server-only";

import { and, eq, lt, ne, or, sql } from "drizzle-orm";
import { db, schema } from "@/lib/db/client";
import { createTapClient } from "./client";
import { getTapConfig } from "./config";
import { createTapOnboardingRunner, selectCommercialDocument, type TapOnboardingRecord, type TapOnboardingRepository } from "./onboarding";

function mapped(row: typeof schema.tapRetailerOnboarding.$inferSelect): TapOnboardingRecord { return row as TapOnboardingRecord; }
function result(row: typeof schema.tapRetailerOnboarding.$inferSelect | undefined): TapOnboardingRecord { if (!row) throw new Error("Tap onboarding row not found"); return mapped(row); }
async function current(id: string): Promise<TapOnboardingRecord> { const [row] = await db.select().from(schema.tapRetailerOnboarding).where(eq(schema.tapRetailerOnboarding.id, id)).limit(1); return result(row); }

const repository: TapOnboardingRepository = {
  async getOrCreate(lawyerId, environment, marketplaceMid) {
    await db.insert(schema.tapRetailerOnboarding).values({ lawyerId, environment, marketplaceMid }).onConflictDoNothing();
    const [row] = await db.select().from(schema.tapRetailerOnboarding).where(and(eq(schema.tapRetailerOnboarding.lawyerId, lawyerId), eq(schema.tapRetailerOnboarding.environment, environment))).limit(1);
    return result(row);
  },
  async claim(id, expectedStage, stage) {
    const staleBefore = new Date(Date.now() - 5 * 60_000);
    const [row] = await db.update(schema.tapRetailerOnboarding).set({ stage, lastAttemptAt: new Date(), attemptCount: sql`${schema.tapRetailerOnboarding.attemptCount} + 1`, updatedAt: new Date() }).where(and(eq(schema.tapRetailerOnboarding.id, id), eq(schema.tapRetailerOnboarding.stage, expectedStage), ne(schema.tapRetailerOnboarding.stage, "active"), or(eq(schema.tapRetailerOnboarding.stage, "tap_failed"), lt(schema.tapRetailerOnboarding.lastAttemptAt, staleBefore), sql`${schema.tapRetailerOnboarding.lastAttemptAt} IS NULL`))).returning();
    return row ? mapped(row) : null;
  },
  async saveFileId(id, kind, value) {
    const field = kind === "commercialRegistration" ? "commercialRegistrationFileId" : kind === "personalId" ? "personalIdFileId" : "ibanCertificateFileId";
    const [row] = await db.update(schema.tapRetailerOnboarding).set({ [field]: value, updatedAt: new Date() }).where(and(eq(schema.tapRetailerOnboarding.id, id), ne(schema.tapRetailerOnboarding.stage, "active"))).returning(); return row ? mapped(row) : current(id);
  },
  async saveLeadId(id, leadId) { const [row] = await db.update(schema.tapRetailerOnboarding).set({ leadId, updatedAt: new Date() }).where(and(eq(schema.tapRetailerOnboarding.id, id), ne(schema.tapRetailerOnboarding.stage, "active"))).returning(); return row ? mapped(row) : current(id); },
  async saveRetailer(id, retailerId, destinationId, payoutEnabled) { const [row] = await db.update(schema.tapRetailerOnboarding).set({ retailerId, destinationId, payoutEnabled, kycStatus: payoutEnabled ? "approved" : "pending", updatedAt: new Date() }).where(and(eq(schema.tapRetailerOnboarding.id, id), ne(schema.tapRetailerOnboarding.stage, "active"))).returning(); return row ? mapped(row) : current(id); },
  async markKycPending(id) { const [row] = await db.update(schema.tapRetailerOnboarding).set({ stage: "tap_kyc_pending", lastCompletedStage: "tap_creating_retailer", lastErrorCode: null, lastErrorMessage: null, updatedAt: new Date() }).where(and(eq(schema.tapRetailerOnboarding.id, id), ne(schema.tapRetailerOnboarding.stage, "active"))).returning(); return row ? mapped(row) : current(id); },
  async markFailed(id, code, message) { const [row] = await db.update(schema.tapRetailerOnboarding).set({ stage: "tap_failed", lastErrorCode: code, lastErrorMessage: message, updatedAt: new Date() }).where(and(eq(schema.tapRetailerOnboarding.id, id), ne(schema.tapRetailerOnboarding.stage, "active"))).returning(); return row ? mapped(row) : current(id); },
};

async function lawyer(id: string) { const [row] = await db.select().from(schema.saudiLawyers).where(eq(schema.saudiLawyers.id, id)).limit(1); if (!row) throw new Error("Lawyer not found"); return row; }
async function download(url: string | null, base64?: string | null) { if (url) { const response = await fetch(url, { signal: AbortSignal.timeout(20_000) }); if (!response.ok) throw new Error("Document download failed"); const blob = await response.blob(); if (blob.size) return blob; } if (base64) return new Blob([Buffer.from(base64, "base64")]); throw new Error("Required onboarding document is missing"); }

export async function runTapOnboardingRuntime(lawyerId: string): Promise<TapOnboardingRecord> {
  const config = getTapConfig();
  return createTapOnboardingRunner({
    config, repository, tapClient: createTapClient(config),
    async loadDocuments(id) {
      const row = await lawyer(id);
      const commercial = selectCommercialDocument(row);
      return { commercialRegistration: await download(commercial.url, commercial.base64), personalId: await download(row.personalIdFileUrl), ibanCertificate: await download(row.ibanCertificateFileUrl) };
    },
    async buildLead(id, files) {
      const row = await lawyer(id);
      const commercial = selectCommercialDocument(row);
      return {
        segment: { type: "BUSINESS", sub_segment: { type: "RETAILER" } }, country: "SA",
        brand: { name: [{ lang: "en", text: row.fullNameEn }, { lang: "ar", text: row.fullNameAr }], channel_services: [{ channel: "website", address: config.siteUrl }] },
        entity: { license: { number: commercial.number, country: "SA", documents: [{ name: commercial.documentName, file: files.commercialRegistration }] } },
        users: [{ name: [{ first: row.fullNameEn, lang: "en" }], email: row.email, phone: row.phone, identification: { documents: [{ name: "identity_document", file: files.personalId }] } }],
        wallet: { iban: row.ibanNumber, documents: [{ name: "bank_certificate", file: files.ibanCertificate }] }, marketplace: { id: config.marketplaceMid }, post: { url: `${config.siteUrl}/api/tap/marketplace/webhook` },
      };
    },
  })(lawyerId);
}
