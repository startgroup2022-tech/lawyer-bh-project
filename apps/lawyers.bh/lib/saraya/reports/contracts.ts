export const reportTypes = ["comprehensive", "finance", "invoices", "leases", "occupancy", "clients", "virtual_addresses", "maintenance", "meeting_rooms"] as const;
export type ReportType = typeof reportTypes[number];
export type ReportFormat = "pdf" | "xlsx";
export type ReportLocale = "ar" | "en";

export interface ReportFilter {
  propertyId: string;
  reportType: ReportType;
  format: ReportFormat;
  locale: ReportLocale;
  from: string;
  to: string;
  status?: string;
}

export interface ReportMetric { labelAr: string; labelEn: string; value: string }
export interface ReportColumn { key: string; labelAr: string; labelEn: string; kind?: "text" | "date" | "money" | "number" }
export interface ReportSection {
  key: Exclude<ReportType, "comprehensive">;
  titleAr: string;
  titleEn: string;
  columns: ReportColumn[];
  rows: Record<string, string | number | null>[];
  totals?: ReportMetric[];
}
export interface ReportDocument {
  metadata: {
    propertyId: string;
    propertyNameAr: string;
    propertyNameEn: string;
    propertyCode: string;
    currencyCode: string;
    from: string;
    to: string;
    generatedAt: string;
    requestedBy?: string;
  };
  summary: ReportMetric[];
  sections: ReportSection[];
}
export interface ReportFile { bytes: Uint8Array; contentType: string; fileName: string }
