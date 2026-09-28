import { db } from "@/lib/db/client";
import { sarayaAuditLogs } from "@/lib/db/saraya-schema";
import { requireSarayaPrincipal } from "../auth/request";
import { sessions } from "../auth/runtime";
import { createReportHandlers } from "./http";
import { renderReportPdf } from "./pdf";
import { reportRepository } from "./repository";
import { createReportService } from "./service";
import { renderReportXlsx } from "./xlsx";

const service = createReportService(reportRepository, { pdf: renderReportPdf, xlsx: renderReportXlsx }, async (entry) => {
  await db.insert(sarayaAuditLogs).values({ propertyId: entry.propertyId, actorUserId: entry.actorUserId, action: "report.exported", entityType: "report", after: entry });
});

export const reportHandlers = createReportHandlers({ authenticate: (request) => requireSarayaPrincipal(request, sessions()), exportReport: service.export });
