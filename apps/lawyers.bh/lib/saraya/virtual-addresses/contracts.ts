export type VirtualAddressStatus =
  | "available"
  | "reserved"
  | "active"
  | "suspended"
  | "inactive";

export interface VirtualAddress {
  id: string;
  propertyId: string;
  slotNumber: number;
  code: string;
  status: VirtualAddressStatus;
  tenantOrganizationId: string | null;
  tenantNameAr: string | null;
  tenantNameEn: string | null;
  businessNameAr: string | null;
  businessNameEn: string | null;
  monthlyFee: string | null;
  startDate: string | null;
  endDate: string | null;
}
