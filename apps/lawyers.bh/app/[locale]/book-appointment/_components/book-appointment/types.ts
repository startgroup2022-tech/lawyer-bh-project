import type { LucideIcon } from "lucide-react";

export type ConsultationMethodCode = string;

export type ConsultMethod = {
  code: ConsultationMethodCode;
  icon: LucideIcon;
  label: { en: string; ar: string };
  fixedPrice: number;
  fixedMinutes: number;
  note?: { en: string; ar: string };
};

export type AvailableLawyer = {
  id: string;
  slug: string;
  nameAr: string;
  nameEn: string;
  subtitleAr: string;
  subtitleEn: string;
  image: string | null;
  rating: number;
  reviewCount: number;
  experienceYears: number;
  workingHours: string;
  registrationLevel?: string | null;
  subscriptionType?: string | null;
};

export type SpecialtyKey =
  | "administrative"
  | "civil"
  | "commercial"
  | "labor"
  | "criminal"
  | "sharia"
  | "constitutional"
  | "cassation"
  | "sports";

export type VideoProvider = "google-meet" | "whatsapp";
export type LawyerSelectionMode = "office" | "lawyer";
export type LawyerSort = "experience_desc" | "rating_desc" | "name_asc";
export type LawyerRegistrationLevel = "all" | "cassation" | "practicing" | "trainee";

export type ProviderSubscriptionType =
  | "lawyer"
  | "consultant"
  | "mediator"
  | "arbitrator"
  | "expert"
  | "private_executor"
  | "private_notary"
  | "translator";

export type BookingDateOption = {
  value: string;
  dayLabel: string;
  dateLabel: string;
  badge: string;
};

export type TimePeriod = {
  value: string;
  label: { en: string; ar: string };
  range: { en: string; ar: string };
};
