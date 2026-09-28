import { ApiError, type SarayaPrincipal } from "../auth/contracts";
import { handle } from "../auth/http";
import { reportTypes, type ReportFile, type ReportFilter } from "./contracts";

interface Dependencies {
  authenticate(request: Request): Promise<SarayaPrincipal>;
  exportReport(principal: SarayaPrincipal, filter: ReportFilter): Promise<ReportFile>;
}

function required(url: URL, key: string) {
  const value = url.searchParams.get(key)?.trim();
  if (!value) throw new ApiError(422, "INVALID_REPORT_FILTER", "تحقق من خيارات التقرير", "Check report filters", { [key]: ["REQUIRED"] });
  return value;
}

export function createReportHandlers(dependencies: Dependencies) {
  return {
    export(request: Request) {
      return handle(async () => {
        const principal = await dependencies.authenticate(request);
        const url = new URL(request.url);
        const propertyId = required(url, "propertyId");
        const reportType = required(url, "reportType");
        const format = required(url, "format");
        const locale = required(url, "locale");
        const from = required(url, "from");
        const to = required(url, "to");
        if (!reportTypes.includes(reportType as never) || !["pdf", "xlsx"].includes(format) || !["ar", "en"].includes(locale)) {
          throw new ApiError(422, "INVALID_REPORT_FILTER", "تحقق من خيارات التقرير", "Check report filters");
        }
        const file = await dependencies.exportReport(principal, { propertyId, reportType: reportType as ReportFilter["reportType"], format: format as ReportFilter["format"], locale: locale as ReportFilter["locale"], from, to, ...(url.searchParams.get("status") ? { status: url.searchParams.get("status")! } : {}) });
        return new Response(file.bytes as BodyInit, {
          headers: {
            "Content-Type": file.contentType,
            "Content-Disposition": `attachment; filename="${file.fileName.replace(/[^A-Za-z0-9._-]/g, "-")}"`,
            "Cache-Control": "private, no-store",
          },
        });
      });
    },
  };
}
