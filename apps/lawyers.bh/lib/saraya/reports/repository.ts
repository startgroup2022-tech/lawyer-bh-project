import { sql } from "drizzle-orm";
import { db } from "@/lib/db/client";
import type { ReportDocument, ReportFilter, ReportMetric, ReportSection } from "./contracts";
import type { ReportRepository } from "./service";

type Row = Record<string, string | number | null>;
const metric = (labelAr: string, labelEn: string, value: string | number): ReportMetric => ({ labelAr, labelEn, value: String(value) });

async function rows(query: ReturnType<typeof sql>): Promise<Row[]> {
  return (await db.execute(query)) as unknown as Row[];
}

async function sections(filter: ReportFilter, ownerId?: string): Promise<ReportSection[]> {
  const owner = ownerId ?? null;
  const status = filter.status ?? null;
  const all = filter.reportType === "comprehensive";
  const result: ReportSection[] = [];
  if (all || filter.reportType === "finance") {
    const data = await rows(sql`SELECT i.number, i.status::text, i.issue_date::text AS "issueDate", i.due_date::text AS "dueDate", i.total_amount::text AS "total", i.paid_amount::text AS "paid", (i.total_amount-i.paid_amount)::text AS "balance" FROM saraya_invoices i JOIN saraya_rental_requests r ON r.property_id=i.property_id AND r.id=i.rental_request_id JOIN saraya_units u ON u.property_id=r.property_id AND u.id=r.unit_id WHERE i.property_id=${filter.propertyId} AND i.issue_date BETWEEN ${filter.from}::date AND ${filter.to}::date AND (${owner}::uuid IS NULL OR u.owner_id=${owner}) AND (${status}::text IS NULL OR i.status::text=${status}) ORDER BY i.issue_date,i.number`);
    result.push({ key: "finance", titleAr: "التحصيل المالي", titleEn: "Financial collection", columns: [{ key: "number", labelAr: "الفاتورة", labelEn: "Invoice" }, { key: "status", labelAr: "الحالة", labelEn: "Status" }, { key: "dueDate", labelAr: "الاستحقاق", labelEn: "Due date", kind: "date" }, { key: "total", labelAr: "الإجمالي", labelEn: "Total", kind: "money" }, { key: "paid", labelAr: "المدفوع", labelEn: "Paid", kind: "money" }, { key: "balance", labelAr: "الرصيد", labelEn: "Balance", kind: "money" }], rows: data, totals: [metric("إجمالي المستحق", "Total due", data.reduce((sum, row) => sum + Number(row.balance ?? 0), 0).toFixed(3))] });
  }
  if (all || filter.reportType === "invoices") {
    const data = await rows(sql`SELECT i.number, COALESCE(t.name_ar,t.name_en,'—') AS tenant, u.unit_number AS unit, i.status::text, i.issue_date::text AS "issueDate", i.due_date::text AS "dueDate", i.total_amount::text AS amount FROM saraya_invoices i JOIN saraya_rental_requests r ON r.property_id=i.property_id AND r.id=i.rental_request_id JOIN saraya_units u ON u.property_id=r.property_id AND u.id=r.unit_id LEFT JOIN saraya_tenant_organizations t ON t.property_id=r.property_id AND t.id=r.tenant_organization_id WHERE i.property_id=${filter.propertyId} AND i.issue_date BETWEEN ${filter.from}::date AND ${filter.to}::date AND (${owner}::uuid IS NULL OR u.owner_id=${owner}) AND (${status}::text IS NULL OR i.status::text=${status}) ORDER BY i.issue_date,i.number`);
    result.push({ key: "invoices", titleAr: "الفواتير", titleEn: "Invoices", columns: [{ key: "number", labelAr: "الرقم", labelEn: "Number" }, { key: "tenant", labelAr: "المستأجر", labelEn: "Tenant" }, { key: "unit", labelAr: "الوحدة", labelEn: "Unit" }, { key: "status", labelAr: "الحالة", labelEn: "Status" }, { key: "dueDate", labelAr: "الاستحقاق", labelEn: "Due date", kind: "date" }, { key: "amount", labelAr: "المبلغ", labelEn: "Amount", kind: "money" }], rows: data, totals: [metric("إجمالي الفواتير", "Invoice total", data.reduce((sum, row) => sum + Number(row.amount ?? 0), 0).toFixed(3))] });
  }
  if (all || filter.reportType === "leases") {
    const data = await rows(sql`SELECT u.unit_number AS unit, COALESCE(t.name_ar,t.name_en) AS tenant, l.status::text, v.start_date::text AS "startDate", v.end_date::text AS "endDate", v.rent_amount::text AS rent, v.frequency::text FROM saraya_leases l JOIN saraya_units u ON u.property_id=l.property_id AND u.id=l.unit_id JOIN saraya_tenant_organizations t ON t.property_id=l.property_id AND t.id=l.tenant_organization_id JOIN saraya_lease_versions v ON v.property_id=l.property_id AND v.lease_id=l.id AND v.version=l.current_version WHERE l.property_id=${filter.propertyId} AND v.start_date<=${filter.to}::date AND v.end_date>=${filter.from}::date AND (${owner}::uuid IS NULL OR u.owner_id=${owner}) AND (${status}::text IS NULL OR l.status::text=${status}) ORDER BY u.unit_number`);
    result.push({ key: "leases", titleAr: "العقود", titleEn: "Leases", columns: [{ key: "unit", labelAr: "الوحدة", labelEn: "Unit" }, { key: "tenant", labelAr: "المستأجر", labelEn: "Tenant" }, { key: "status", labelAr: "الحالة", labelEn: "Status" }, { key: "startDate", labelAr: "البداية", labelEn: "Start", kind: "date" }, { key: "endDate", labelAr: "النهاية", labelEn: "End", kind: "date" }, { key: "rent", labelAr: "الإيجار", labelEn: "Rent", kind: "money" }], rows: data, totals: [metric("عدد العقود", "Lease count", data.length)] });
  }
  if (all || filter.reportType === "occupancy") {
    const data = await rows(sql`SELECT u.unit_number AS unit, COALESCE(u.display_name_ar,u.display_name_en,u.unit_number) AS name, COALESCE(o.name_ar,o.name_en,'—') AS owner, u.status::text, u.floor, u.area_square_meters::text AS area, u.market_rent::text AS rent FROM saraya_units u LEFT JOIN saraya_owners o ON o.property_id=u.property_id AND o.id=u.owner_id WHERE u.property_id=${filter.propertyId} AND (${owner}::uuid IS NULL OR u.owner_id=${owner}) AND (${status}::text IS NULL OR u.status::text=${status}) ORDER BY u.unit_number`);
    result.push({ key: "occupancy", titleAr: "الوحدات والإشغال", titleEn: "Units and occupancy", columns: [{ key: "unit", labelAr: "الوحدة", labelEn: "Unit" }, { key: "name", labelAr: "الاسم", labelEn: "Name" }, { key: "owner", labelAr: "المالك", labelEn: "Owner" }, { key: "status", labelAr: "الحالة", labelEn: "Status" }, { key: "area", labelAr: "المساحة", labelEn: "Area", kind: "number" }, { key: "rent", labelAr: "الإيجار", labelEn: "Rent", kind: "money" }], rows: data, totals: [metric("إجمالي الوحدات", "Total units", data.length), metric("المشغولة", "Occupied", data.filter((row) => row.status === "occupied").length)] });
  }
  if (all || filter.reportType === "clients") {
    const data = await rows(sql`SELECT 'tenant' AS kind, COALESCE(t.name_ar,t.name_en) AS name, t.registration_number AS registration, CASE WHEN t.is_active THEN 'active' ELSE 'inactive' END AS status FROM saraya_tenant_organizations t WHERE t.property_id=${filter.propertyId} UNION ALL SELECT 'owner', COALESCE(o.name_ar,o.name_en), o.registration_number, 'active' FROM saraya_owners o WHERE o.property_id=${filter.propertyId} AND (${owner}::uuid IS NULL OR o.id=${owner}) ORDER BY kind,name`);
    result.push({ key: "clients", titleAr: "المستأجرون والملاك", titleEn: "Tenants and owners", columns: [{ key: "kind", labelAr: "النوع", labelEn: "Type" }, { key: "name", labelAr: "الاسم", labelEn: "Name" }, { key: "registration", labelAr: "السجل", labelEn: "Registration" }, { key: "status", labelAr: "الحالة", labelEn: "Status" }], rows: data, totals: [metric("إجمالي العملاء", "Total clients", data.length)] });
  }
  if (all || filter.reportType === "virtual_addresses") {
    const data = await rows(sql`SELECT v.code, v.slot_number AS slot, v.status, COALESCE(v.business_name_ar,v.business_name_en,'—') AS business, v.monthly_fee::text AS fee, v.start_date::text AS "startDate", v.end_date::text AS "endDate" FROM saraya_virtual_addresses v WHERE v.property_id=${filter.propertyId} AND (v.start_date IS NULL OR v.start_date<=${filter.to}::date) AND (v.end_date IS NULL OR v.end_date>=${filter.from}::date) AND (${status}::text IS NULL OR v.status=${status}) ORDER BY v.slot_number`);
    result.push({ key: "virtual_addresses", titleAr: "العناوين الافتراضية", titleEn: "Virtual addresses", columns: [{ key: "code", labelAr: "الرمز", labelEn: "Code" }, { key: "slot", labelAr: "الخانة", labelEn: "Slot", kind: "number" }, { key: "business", labelAr: "النشاط", labelEn: "Business" }, { key: "status", labelAr: "الحالة", labelEn: "Status" }, { key: "fee", labelAr: "الرسوم", labelEn: "Fee", kind: "money" }], rows: data, totals: [metric("إجمالي العناوين", "Total addresses", data.length)] });
  }
  if (all || filter.reportType === "maintenance") {
    const data = await rows(sql`SELECT m.ticket_number AS number, m.title, m.priority, m.status, COALESCE(u.unit_number,'—') AS unit, m.expense_amount::text AS expense, m.created_at::date::text AS date FROM saraya_maintenance_tickets m LEFT JOIN saraya_units u ON u.property_id=m.property_id AND u.id=m.unit_id WHERE m.property_id=${filter.propertyId} AND m.created_at::date BETWEEN ${filter.from}::date AND ${filter.to}::date AND (${owner}::uuid IS NULL OR u.owner_id=${owner}) AND (${status}::text IS NULL OR m.status=${status}) ORDER BY m.created_at DESC`);
    result.push({ key: "maintenance", titleAr: "الصيانة والمصاريف", titleEn: "Maintenance and expenses", columns: [{ key: "number", labelAr: "التذكرة", labelEn: "Ticket" }, { key: "title", labelAr: "العنوان", labelEn: "Title" }, { key: "unit", labelAr: "الوحدة", labelEn: "Unit" }, { key: "priority", labelAr: "الأولوية", labelEn: "Priority" }, { key: "status", labelAr: "الحالة", labelEn: "Status" }, { key: "expense", labelAr: "المصروف", labelEn: "Expense", kind: "money" }], rows: data, totals: [metric("إجمالي المصاريف", "Total expenses", data.reduce((sum, row) => sum + Number(row.expense ?? 0), 0).toFixed(3))] });
  }
  if (all || filter.reportType === "meeting_rooms") {
    const data = await rows(sql`SELECT r.code AS room, COALESCE(r.name_ar,r.name_en) AS "roomName", b.status::text, b.start_at::date::text AS date, b.start_at::time::text AS "startTime", b.attendee_count AS attendees, b.amount::text AS amount, b.purpose FROM saraya_meeting_room_bookings b JOIN saraya_meeting_rooms r ON r.property_id=b.property_id AND r.id=b.room_id WHERE b.property_id=${filter.propertyId} AND b.start_at::date BETWEEN ${filter.from}::date AND ${filter.to}::date AND (${status}::text IS NULL OR b.status::text=${status}) ORDER BY b.start_at`);
    result.push({ key: "meeting_rooms", titleAr: "حجوزات قاعات الاجتماعات", titleEn: "Meeting-room bookings", columns: [{ key: "room", labelAr: "القاعة", labelEn: "Room" }, { key: "date", labelAr: "التاريخ", labelEn: "Date", kind: "date" }, { key: "startTime", labelAr: "الوقت", labelEn: "Time" }, { key: "attendees", labelAr: "الحضور", labelEn: "Attendees", kind: "number" }, { key: "status", labelAr: "الحالة", labelEn: "Status" }, { key: "amount", labelAr: "المبلغ", labelEn: "Amount", kind: "money" }], rows: data, totals: [metric("إجمالي الحجوزات", "Total bookings", data.length), metric("إجمالي الإيراد", "Total revenue", data.reduce((sum, row) => sum + Number(row.amount ?? 0), 0).toFixed(3))] });
  }
  return result;
}

export const reportRepository: ReportRepository = {
  async load(filter, scope) {
    const properties = await rows(sql`SELECT id::text, code, name_ar AS "nameAr", name_en AS "nameEn", currency_code AS currency FROM saraya_properties WHERE id=${filter.propertyId} LIMIT 1`);
    const property = properties[0];
    const reportSections = await sections(filter, scope.ownerId);
    return {
      metadata: { propertyId: filter.propertyId, propertyNameAr: String(property?.nameAr ?? "سرايا سكوير"), propertyNameEn: String(property?.nameEn ?? "Saraya Square"), propertyCode: String(property?.code ?? "SQ"), currencyCode: String(property?.currency ?? "BHD"), from: filter.from, to: filter.to, generatedAt: new Date().toISOString() },
      summary: [metric("عدد الأقسام", "Sections", reportSections.length), metric("إجمالي السجلات", "Total records", reportSections.reduce((sum, section) => sum + section.rows.length, 0))],
      sections: reportSections,
    };
  },
};
