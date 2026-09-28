// Seed script — populates the database with the same demo data the
// admin pages used to render before they were wired to tRPC.
//
//   npm run db:seed
//
// Run AFTER `npm run db:push` (or after Vercel build runs migrations).

import "dotenv/config";
import { db, schema } from "../lib/db/client";

async function main() {
  console.log("[seed] starting…");

  // 1. Insert lawyers
  const lawyerInserts = await db
    .insert(schema.lawyers)
    .values([
      {
        fullName: "Ahmed Al Doseri",
        // Ministry of Justice license numbers — numeric IDs issued by
        // the Lawyers Affairs Department. Format varies but typically
        // a 4–5 digit ID, sometimes with year prefix (year/seq).
        rollNumber: "2018/1142",
        phone: "+97333112233",
        email: "ahmed.aldoseri@legalsos.lawyer",
        countryCode: "BH",
        languages: ["en", "ar"],
        emergencyReady: true,
        serviceRadiusKm: 25,
        rating: "4.90",
        totalCases: 142,
      },
      {
        fullName: "Sara Al Mahmoud",
        rollNumber: "2020/0891",
        phone: "+97336789012",
        email: "sara.almahmoud@legalsos.lawyer",
        countryCode: "BH",
        languages: ["en", "ar"],
        emergencyReady: true,
        serviceRadiusKm: 30,
        rating: "4.80",
        totalCases: 89,
      },
      {
        fullName: "Mohammed Al Mannai",
        rollNumber: "2015/0234",
        phone: "+97333445566",
        email: "mohammed.almannai@legalsos.lawyer",
        countryCode: "BH",
        languages: ["ar"],
        emergencyReady: false,
        serviceRadiusKm: 15,
        rating: "4.70",
        totalCases: 211,
      },
      {
        fullName: "Noor Al Hashimi",
        rollNumber: "2021/1567",
        phone: "+97339334455",
        email: "noor.alhashimi@legalsos.lawyer",
        countryCode: "BH",
        languages: ["en"],
        emergencyReady: true,
        serviceRadiusKm: 20,
        rating: "5.00",
        totalCases: 54,
      },
    ])
    .onConflictDoNothing()
    .returning({ id: schema.lawyers.id, name: schema.lawyers.fullName });

  console.log(`[seed] inserted ${lawyerInserts.length} lawyers`);

  const byName = (n: string) => lawyerInserts.find((l) => l.name === n)?.id;

  // 2. Insert cases
  const now = Date.now();
  const caseRows = [
    {
      caseRef: "SOS-260527-7H4K",
      caseType: "emergency_consultation" as const,
      fulfillment: "remote" as const,
      countryCode: "BH" as const,
      language: "ar" as const,
      clientName: "Ali Hasan",
      clientPhone: "+97336470706",
      clientIdType: "cpr" as const,
      clientIdNumber: "880101234",
      assignedLawyerId: byName("Ahmed Al Doseri"),
      serviceStatus: "mobilizing" as const,
      paymentStatus: "success" as const,
      baseFeeBhd: "25",
      createdAt: new Date(now - 4 * 60 * 1000),
    },
    {
      caseRef: "SOS-260527-2P9X",
      caseType: "emergency_arrest" as const,
      fulfillment: "field" as const,
      countryCode: "BH" as const,
      language: "en" as const,
      clientName: "Mariam Khalifa",
      clientPhone: "+97339112233",
      clientIdType: "cpr" as const,
      clientIdNumber: "920202345",
      locationAddress: "Manama Police Station, Block 308",
      locationLat: "26.2235",
      locationLng: "50.5876",
      assignedLawyerId: byName("Sara Al Mahmoud"),
      serviceStatus: "arrived" as const,
      paymentStatus: "success" as const,
      baseFeeBhd: "150",
      createdAt: new Date(now - 22 * 60 * 1000),
    },
    {
      caseRef: "SOS-260527-Q5L8",
      caseType: "emergency_search" as const,
      fulfillment: "field" as const,
      countryCode: "BH" as const,
      language: "en" as const,
      clientName: "Hamad Al Khalifa",
      clientPhone: "+97333445566",
      clientIdType: "cpr" as const,
      clientIdNumber: "850303456",
      locationAddress: "Riffa Industrial Area",
      locationLat: "26.1300",
      locationLng: "50.5550",
      serviceStatus: "pending" as const,
      paymentStatus: "pending" as const,
      baseFeeBhd: "200",
      createdAt: new Date(now - 1 * 60 * 1000),
    },
    {
      caseRef: "SOS-260527-K3M2",
      caseType: "emergency_report" as const,
      fulfillment: "field" as const,
      countryCode: "BH" as const,
      language: "ar" as const,
      clientName: "Fatima Al Sayed",
      clientPhone: "+97333778899",
      clientIdType: "cpr" as const,
      clientIdNumber: "910404567",
      locationAddress: "Hamad Town Block 1207",
      locationLat: "26.1100",
      locationLng: "50.5100",
      assignedLawyerId: byName("Mohammed Al Mannai"),
      serviceStatus: "completed" as const,
      paymentStatus: "success" as const,
      baseFeeBhd: "150",
      createdAt: new Date(now - 95 * 60 * 1000),
      completedTimestamp: new Date(now - 30 * 60 * 1000),
    },
    {
      caseRef: "SOS-260527-B7T4",
      caseType: "emergency_consultation" as const,
      fulfillment: "remote" as const,
      countryCode: "BH" as const,
      language: "en" as const,
      clientName: "Yousef Janahi",
      clientPhone: "+97336889922",
      clientIdType: "cpr" as const,
      clientIdNumber: "930505678",
      assignedLawyerId: byName("Noor Al Hashimi"),
      serviceStatus: "completed" as const,
      paymentStatus: "success" as const,
      baseFeeBhd: "25",
      createdAt: new Date(now - 3 * 60 * 60 * 1000),
      completedTimestamp: new Date(now - 2 * 60 * 60 * 1000 - 45 * 60 * 1000),
    },
  ];

  const insertedCases = await db
    .insert(schema.cases)
    .values(caseRows)
    .onConflictDoNothing()
    .returning({ caseRef: schema.cases.caseRef });

  console.log(`[seed] inserted ${insertedCases.length} cases`);
  console.log("[seed] done.");
  process.exit(0);
}

main().catch((err) => {
  console.error("[seed] failed:", err);
  process.exit(1);
});
