export type TapJson = null | boolean | number | string | TapJson[] | { [key: string]: TapJson };

export type TapFilePurpose =
  | "bank_certificate"
  | "business_icon"
  | "business_logo"
  | "customer_signature"
  | "commercial_registration"
  | "dispute_evidence"
  | "finance_report_run"
  | "identity_document"
  | "pci_document"
  | "sigma_scheduled_query"
  | "tax_document_user_upload";

export interface TapFileUploadInput {
  file: Blob;
  title: string;
  purpose?: TapFilePurpose;
  expiresAt?: Date;
  createLink?: boolean;
}

export interface TapFileResponse {
  id: string;
  [key: string]: unknown;
}

export interface TapRetailerLeadInput {
  segment: {
    type: "BUSINESS";
    sub_segment: { type: "RETAILER"; [key: string]: unknown };
    [key: string]: unknown;
  };
  country: string;
  brand: Record<string, unknown>;
  entity: Record<string, unknown>;
  users: Record<string, unknown>[];
  wallet: Record<string, unknown>;
  marketplace: { id: string; [key: string]: unknown };
  post?: { url: string };
  [key: string]: unknown;
}

export interface TapLeadResponse {
  id: string;
  status?: string;
  [key: string]: unknown;
}

export interface TapRetailerResponse {
  lead: {
    id: string;
    status: string;
    [key: string]: unknown;
  };
  retailer: {
    id: string;
    status: { payout: boolean; [key: string]: unknown };
    [key: string]: unknown;
  };
  [key: string]: unknown;
}

export interface TapChargeInput {
  amount: number;
  currency: string;
  [key: string]: unknown;
}

export interface TapDestination {
  id: string;
  amount: number;
  currency: string;
  [key: string]: unknown;
}

export interface TapDestinations {
  destination: TapDestination[];
}

export interface TapChargeResponse {
  id: string;
  status: string;
  [key: string]: unknown;
}
