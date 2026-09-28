export type ConsultationTypeInput = {
  code?: string;
  nameAr: string;
  nameEn: string;
  price: string;
  currencyCode: string;
  durationMinutes: number;
  iconKey: string;
};

export type ConsultationTypeRecord = Required<ConsultationTypeInput> & {
  id: string;
  countryCode: string;
  sortOrder: number;
  isActive: boolean;
  archivedAt: string | null;
};

export type AdminActor = { adminId: string };
