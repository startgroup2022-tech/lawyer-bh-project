export interface OnboardingPropertyOption {
  id: string;
  code: string;
  nameAr: string;
  nameEn: string;
  currencyCode: string;
}

export interface OnboardingUnitOption {
  id: string;
  propertyId: string;
  unitNumber: string;
  displayNameAr: string | null;
  displayNameEn: string | null;
  marketRent: string | null;
}

export interface OnboardingVirtualAddressOption {
  id: string;
  propertyId: string;
  code: string;
  slotNumber: number;
  monthlyFee: string | null;
}

export interface ClientOnboardingOptions {
  properties: OnboardingPropertyOption[];
  units?: OnboardingUnitOption[];
  virtualAddresses?: OnboardingVirtualAddressOption[];
}

export interface TenantUnitSelection {
  unitId: string;
  startDate: string;
  endDate: string;
  rentAmount: string;
  depositAmount: string;
  frequency: "monthly" | "quarterly" | "annual";
  dueDay: number;
  graceDays: number;
}

export interface TenantVirtualAddressSelection {
  virtualAddressId: string;
  businessNameAr: string;
  businessNameEn: string;
  monthlyFee: string;
  startDate: string;
  endDate: string;
}

export interface TenantOnboardingInput {
  propertyId: string;
  nameAr: string;
  nameEn: string;
  registrationNumber?: string;
  taxNumber?: string;
  units: TenantUnitSelection[];
  virtualAddresses: TenantVirtualAddressSelection[];
}

export interface OwnerOnboardingInput {
  propertyIds: string[];
  nameAr: string;
  nameEn: string;
  registrationNumber?: string;
}

export interface TenantOnboardingResult {
  tenantId: string;
  leaseIds: string[];
  virtualAddressIds: string[];
}

export interface OwnerOnboardingResult {
  ownerIds: string[];
}
