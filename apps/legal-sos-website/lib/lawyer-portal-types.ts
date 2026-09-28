export type LawyerSessionProfile = {
  id: string;
  countryCode: string;
  nameAr: string;
  nameEn: string;
  email: string | null;
  phone: string;
  registrationNo: string;
  status: string;
  active: boolean;
  emergencyReady: boolean;
  isAvailable: boolean;
  image: string | null;
  rating: number;
  totalRequests: number;
  completedRequests: number;
};

export type LawyerRequestLists = {
  advocateOnline: boolean;
  now: string;
  newOffers: Array<{
    id: string; caseRef: string; caseType: string; baseFeeBhd: number;
    createdAt: string; deadline: string | null;
  }>;
  activeCases: Array<{
    id: string; caseRef: string; caseType: string; workflowType: string | null;
    contactName: string | null;
    location: { lat: number; lng: number; address?: string } | null;
    serviceStatus: string | null; createdAt: string;
  }>;
  completedCases: Array<{
    id: string; caseRef: string; caseType: string; workflowType: string | null;
    serviceStatus: string | null; createdAt: string; completedAt: string | null;
  }>;
};
