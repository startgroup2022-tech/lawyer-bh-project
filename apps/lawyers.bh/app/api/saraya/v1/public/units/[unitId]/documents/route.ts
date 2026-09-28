import { createApplicantDocument } from "@/lib/saraya/documents/applicant-http-runtime";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ unitId: string }> },
) {
  return createApplicantDocument(request, (await params).unitId);
}
