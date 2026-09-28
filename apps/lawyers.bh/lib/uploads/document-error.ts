const documentFields = [
  "licenseFile",
  "institutionLicenseFile",
  "ibanCertificateFile",
  "personalIdFile",
] as const;

export type DocumentField = (typeof documentFields)[number];

function isDocumentField(field: string): field is DocumentField {
  return documentFields.some((allowed) => allowed === field);
}

export class InvalidDocumentUploadError extends Error {
  readonly field: DocumentField;

  constructor(field: DocumentField) {
    super("invalid_document");
    this.name = "InvalidDocumentUploadError";
    this.field = field;
  }
}

export async function withDocumentField<T>(
  field: string,
  operation: () => Promise<T>,
): Promise<T> {
  try {
    return await operation();
  } catch (error) {
    if (
      isDocumentField(field) &&
      error instanceof Error &&
      error.message === "invalid_pdf"
    ) {
      throw new InvalidDocumentUploadError(field);
    }
    throw error;
  }
}

export function invalidDocumentResponse(error: unknown): Response | null {
  if (!(error instanceof InvalidDocumentUploadError)) return null;
  return Response.json(
    { ok: false, error: "invalid_document", field: error.field },
    { status: 400 },
  );
}
