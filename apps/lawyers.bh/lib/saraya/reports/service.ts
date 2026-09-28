import { ApiError, type SarayaPrincipal } from "../auth/contracts";
import type { ReportDocument, ReportFile, ReportFilter } from "./contracts";

export interface ReportRepository {
  load(filter: ReportFilter, scope: { ownerId?: string }): Promise<ReportDocument>;
}
type Renderer = (document: ReportDocument, locale: "ar" | "en") => Promise<Uint8Array>;
type AuditWriter = (entry: { propertyId: string; actorUserId: string; reportType: string; format: string; from: string; to: string }) => Promise<void>;

const isoDate = /^\d{4}-\d{2}-\d{2}$/;

export function createReportService(
  repository: ReportRepository,
  renderers: { pdf: Renderer; xlsx: Renderer },
  audit: AuditWriter,
) {
  return {
    async export(principal: SarayaPrincipal, filter: ReportFilter): Promise<ReportFile> {
      const membership = principal.memberships.find((item) => item.propertyId === filter.propertyId);
      if (!membership) throw new ApiError(403, "PROPERTY_ACCESS_DENIED", "لا تملك صلاحية لهذا العقار", "Property access denied");
      if (membership.role === "tenant" || membership.role === "maintenance") {
        throw new ApiError(403, "REPORT_ACCESS_DENIED", "لا تملك صلاحية تصدير التقارير", "Report export access denied");
      }
      if (!isoDate.test(filter.from) || !isoDate.test(filter.to) || filter.from > filter.to) {
        throw new ApiError(422, "INVALID_REPORT_RANGE", "فترة التقرير غير صحيحة", "Invalid report date range", { from: ["INVALID"], to: ["INVALID"] });
      }
      const document = await repository.load(filter, membership.role === "owner" && membership.ownerId ? { ownerId: membership.ownerId } : {});
      const bytes = await renderers[filter.format](document, filter.locale);
      const extension = filter.format === "pdf" ? "pdf" : "xlsx";
      const contentType = filter.format === "pdf" ? "application/pdf" : "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
      const reportName = filter.reportType.replaceAll("_", "-");
      const fileName = `saraya-square-${reportName}-${filter.from}-${filter.to}-${filter.locale}.${extension}`;
      await audit({ propertyId: filter.propertyId, actorUserId: principal.userId, reportType: filter.reportType, format: filter.format, from: filter.from, to: filter.to });
      return { bytes, contentType, fileName };
    },
  };
}
