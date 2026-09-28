import { createHash, randomUUID } from "node:crypto";
import { sql } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { ApiError } from "../auth/contracts";
import { documentStorage } from "../documents/storage";
import { buildRentSchedule } from "./schedule";
import type { ContractSnapshot } from "./contract-renderer";
import type { LeaseCheckoutRepository } from "./checkout-service";

const first = <T>(rows: unknown) => (rows as T[])[0];
const token = () => createHash("sha256").update(randomUUID()).digest("hex");
const decimal = (minor: string) => `${BigInt(minor) / BigInt(1000)}.${String(BigInt(minor) % BigInt(1000)).padStart(3, "0")}`;
interface PaidRequestRow {
  status: string; ownerUserId: string | null; tenant_organization_id: string | null;
  applicant_name_ar: string | null; applicant_name_en: string | null; registration_number: string | null;
  userNameAr: string; userNameEn: string; tenant_user_id: string; email: string | null; phone: string | null;
  start_date: string; end_date: string; rent_amount: string; deposit_amount: string; fee_amount: string; currency: string;
  propertyNameAr: string; propertyNameEn: string; unitNumber: string; ownerNameAr: string; ownerNameEn: string;
  paymentReference: string; resolved_approval_mode: string; decided_at: string | Date | null; unit_id: string; decided_by_user_id: string | null;
}

export const leaseCheckoutRepository: LeaseCheckoutRepository = {
  async createForPaidRequest(propertyId, requestId, build) {
    let storedKey: string | null = null;
    try {
      return await db.transaction(async (tx) => {
        await tx.execute(sql`SELECT pg_advisory_xact_lock(hashtextextended(${`${propertyId}:${requestId}`}, 0))`);
        const existingRows = await tx.execute(sql`
          SELECT r.lease_id AS "leaseId", p.lease_checksum AS checksum
          FROM saraya_rental_requests r LEFT JOIN saraya_lease_packages p ON p.lease_id=r.lease_id
          WHERE r.property_id=${propertyId} AND r.id=${requestId} FOR UPDATE OF r
        `);
        const existing = first<{ leaseId: string | null; checksum: string | null }>(existingRows);
        if (!existing) throw new ApiError(404, "RENTAL_REQUEST_NOT_FOUND", "طلب الإيجار غير موجود", "Rental request not found");
        if (existing.leaseId && existing.checksum) return { leaseId: existing.leaseId, checksum: existing.checksum };

        const rows = await tx.execute(sql`
          SELECT r.*, p.name_ar AS "propertyNameAr", p.name_en AS "propertyNameEn", u.unit_number AS "unitNumber",
                 usr.display_name_ar AS "userNameAr", usr.display_name_en AS "userNameEn", usr.normalized_email AS email, usr.normalized_phone AS phone,
                 o.id AS "ownerId", o.user_id AS "ownerUserId", o.name_ar AS "ownerNameAr", o.name_en AS "ownerNameEn",
                 d.provider_reference AS "paymentReference", d.verified_at AS "paymentVerifiedAt"
          FROM saraya_rental_requests r
          JOIN saraya_properties p ON p.id=r.property_id
          JOIN saraya_units u ON u.property_id=r.property_id AND u.id=r.unit_id
          JOIN saraya_users usr ON usr.id=r.tenant_user_id
          JOIN saraya_owners o ON o.property_id=u.property_id AND o.id=u.owner_id
          JOIN saraya_payment_demands d ON d.property_id=r.property_id AND d.rental_request_id=r.id AND d.status='paid'
          WHERE r.property_id=${propertyId} AND r.id=${requestId}
          FOR UPDATE OF r,u
        `);
        const request = first<PaidRequestRow>(rows);
        if (!request || request.status !== "paid_awaiting_signature" || !request.ownerUserId) throw new ApiError(409, "LEASE_CHECKOUT_NOT_READY", "الطلب غير جاهز لإنشاء العقد", "The request is not ready for lease creation");

        let tenantOrganizationId = request.tenant_organization_id as string | null;
        if (!tenantOrganizationId) {
          const normalizedRegistration = request.registration_number?.replace(/\s+/g, "").toLocaleLowerCase("en-US") || null;
          await tx.execute(sql`SELECT pg_advisory_xact_lock(hashtextextended(${`${propertyId}:${request.tenant_user_id}:${normalizedRegistration ?? "individual"}`}, 0))`);
          const reusableRows = await tx.execute(sql`
            SELECT tenant.id,
                   lower(regexp_replace(btrim(tenant.registration_number), '\\s+', '', 'g')) AS "normalizedRegistration",
                   EXISTS (SELECT 1 FROM saraya_contacts contact WHERE contact.property_id=tenant.property_id AND contact.tenant_organization_id=tenant.id AND contact.user_id=${request.tenant_user_id}) AS "userLinked",
                   (${normalizedRegistration}::text IS NOT NULL AND lower(regexp_replace(btrim(tenant.registration_number), '\\s+', '', 'g'))=${normalizedRegistration}) AS "registrationLinked"
            FROM saraya_tenant_organizations tenant
            WHERE tenant.property_id=${propertyId} AND tenant.is_active=true AND (
              EXISTS (SELECT 1 FROM saraya_contacts contact WHERE contact.property_id=tenant.property_id AND contact.tenant_organization_id=tenant.id AND contact.user_id=${request.tenant_user_id})
              OR (${normalizedRegistration}::text IS NOT NULL AND lower(regexp_replace(btrim(tenant.registration_number), '\\s+', '', 'g'))=${normalizedRegistration})
            ) FOR UPDATE OF tenant
          `);
          const reusable = reusableRows as unknown as Array<{ id: string; normalizedRegistration: string | null; userLinked: boolean; registrationLinked: boolean }>;
          const userLinked = reusable.filter((item) => item.userLinked);
          const registrationLinked = reusable.filter((item) => item.registrationLinked);
          if (userLinked.length > 1 || registrationLinked.length > 1 || (userLinked[0] && registrationLinked[0] && userLinked[0].id !== registrationLinked[0].id) || (userLinked[0]?.normalizedRegistration && normalizedRegistration && userLinked[0].normalizedRegistration !== normalizedRegistration)) {
            throw new ApiError(409, "TENANT_IDENTITY_CONFLICT", "رقم السجل التجاري لا يطابق سجل المستأجر الموثق", "Commercial registration conflicts with the verified tenant identity");
          }
          if (userLinked[0]) {
            tenantOrganizationId = userLinked[0].id;
            if (normalizedRegistration && !userLinked[0].normalizedRegistration) await tx.execute(sql`UPDATE saraya_tenant_organizations SET registration_number=${request.registration_number},updated_at=now() WHERE property_id=${propertyId} AND id=${tenantOrganizationId} AND NULLIF(btrim(registration_number),'') IS NULL`);
          } else if (registrationLinked[0]) tenantOrganizationId = registrationLinked[0].id;
          else {
            const orgRows = await tx.execute(sql`
              INSERT INTO saraya_tenant_organizations(property_id,name_ar,name_en,registration_number)
              VALUES (${propertyId}, ${request.applicant_name_ar || request.userNameAr}, ${request.applicant_name_en || request.userNameEn}, ${request.registration_number}) RETURNING id
            `);
            tenantOrganizationId = first<{ id: string }>(orgRows)!.id;
          }
          await tx.execute(sql`UPDATE saraya_rental_requests SET tenant_organization_id=${tenantOrganizationId} WHERE property_id=${propertyId} AND id=${requestId}`);
        }
        await tx.execute(sql`
          INSERT INTO saraya_contacts(property_id,tenant_organization_id,user_id,name,email,phone,is_primary)
          SELECT ${propertyId},${tenantOrganizationId},${request.tenant_user_id},${request.userNameEn},${request.email},${request.phone},true
          ON CONFLICT (property_id,user_id) WHERE tenant_organization_id IS NOT NULL AND user_id IS NOT NULL DO NOTHING
        `);
        await tx.execute(sql`
          INSERT INTO saraya_property_memberships(property_id,user_id,role)
          SELECT ${propertyId},${request.tenant_user_id},'tenant'
          WHERE NOT EXISTS (SELECT 1 FROM saraya_property_memberships WHERE property_id=${propertyId} AND user_id=${request.tenant_user_id})
        `);

        const leaseId = randomUUID();
        const versionId = randomUUID();
        const documentId = randomUUID();
        const terms = { startDate: request.start_date, endDate: request.end_date, rentAmount: request.rent_amount, depositAmount: request.deposit_amount, frequency: "monthly" as const, dueDay: Number(String(request.start_date).slice(8, 10)), graceDays: 0, discountAmount: "0.000", feeAmount: request.fee_amount };
        const schedule = buildRentSchedule(terms);
        const generatedAt = new Date();
        const snapshot: ContractSnapshot = {
          leaseId, version: 1, propertyNameAr: request.propertyNameAr, propertyNameEn: request.propertyNameEn, unitNumber: request.unitNumber,
          tenantNameAr: request.applicant_name_ar || request.userNameAr, tenantNameEn: request.applicant_name_en || request.userNameEn,
          ownerNameAr: request.ownerNameAr, ownerNameEn: request.ownerNameEn, startDate: terms.startDate, endDate: terms.endDate,
          rentAmount: terms.rentAmount, depositAmount: terms.depositAmount, feeAmount: terms.feeAmount, currency: request.currency,
          paymentReference: request.paymentReference, approvalAudit: `${request.resolved_approval_mode}:${request.decided_at ? new Date(request.decided_at).toISOString() : "instant"}`,
          schedule: schedule.map(({ sequence, dueDate, totalMinor }) => ({ sequence, dueDate, totalMinor })), signatures: [], generatedAt,
        };
        const rendered = await build(snapshot);
        storedKey = `saraya/${propertyId}/lease/${leaseId}/v1-draft-${rendered.documentChecksum}.pdf`;
        await documentStorage.put({ key: storedKey, body: rendered.bytes, contentType: "application/pdf" });

        await tx.execute(sql`INSERT INTO saraya_leases(id,property_id,unit_id,tenant_organization_id,status,current_version) VALUES (${leaseId},${propertyId},${request.unit_id},${tenantOrganizationId},'pending_approval',1)`);
        await tx.execute(sql`INSERT INTO saraya_lease_versions(id,property_id,lease_id,version,start_date,end_date,rent_amount,deposit_amount,frequency,due_day,grace_days,discount_amount,fee_amount,created_by_user_id) VALUES (${versionId},${propertyId},${leaseId},1,${terms.startDate},${terms.endDate},${terms.rentAmount},${terms.depositAmount},${terms.frequency},${terms.dueDay},0,'0.000',${terms.feeAmount},${request.decided_by_user_id})`);
        for (const item of schedule) await tx.execute(sql`INSERT INTO saraya_rent_schedule_items(property_id,lease_id,lease_version_id,sequence,period_start,period_end,due_date,grace_until,base_amount,discount_amount,fee_amount,total_amount) VALUES (${propertyId},${leaseId},${versionId},${item.sequence},${item.periodStart},${item.periodEnd},${item.dueDate},${item.graceUntil},${decimal(item.baseMinor)},${decimal(item.discountMinor)},${decimal(item.feeMinor)},${decimal(item.totalMinor)})`);
        await tx.execute(sql`INSERT INTO saraya_documents(id,property_id,unit_id,tenant_organization_id,lease_id,uploaded_by_user_id,category,title,original_name,content_type,size_bytes,storage_key) VALUES (${documentId},${propertyId},${request.unit_id},${tenantOrganizationId},${leaseId},${request.tenant_user_id},'lease','Lease draft v1','lease-v1-draft.pdf','application/pdf',${rendered.bytes.length},${storedKey})`);
        await tx.execute(sql`INSERT INTO saraya_lease_packages(property_id,lease_id,lease_version_id,rental_request_id,lease_checksum,draft_document_id,snapshot,generated_at) VALUES (${propertyId},${leaseId},${versionId},${requestId},${rendered.leaseChecksum},${documentId},${JSON.stringify({ ...snapshot, generatedAt: generatedAt.toISOString() })}::jsonb,${generatedAt.toISOString()})`);
        await tx.execute(sql`UPDATE saraya_rental_requests SET lease_id=${leaseId},updated_at=now() WHERE property_id=${propertyId} AND id=${requestId} AND lease_id IS NULL`);
        await tx.execute(sql`INSERT INTO saraya_lease_signature_requests(property_id,lease_id,signer_role,signer_user_id,token_hash) VALUES (${propertyId},${leaseId},'tenant',${request.tenant_user_id},${token()}),(${propertyId},${leaseId},'owner',${request.ownerUserId},${token()})`);
        return { leaseId, checksum: rendered.leaseChecksum };
      });
    } catch (error) {
      if (storedKey) await documentStorage.delete(storedKey).catch(() => undefined);
      throw error;
    }
  },
};
