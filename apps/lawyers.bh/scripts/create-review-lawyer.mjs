import bcrypt from "bcryptjs";
import postgres from "postgres";
import { pathToFileURL } from "node:url";

function required(value, name) {
  const normalized = String(value ?? "").trim();
  if (!normalized) throw new Error(`${name} is required`);
  return normalized;
}

export function beginSerializableTransaction(sql, operation) {
  return sql.begin("isolation level serializable", operation);
}

export async function createReviewLawyerAccount({
  email,
  password,
  registrationNo,
  membershipNo,
  phone,
  fullNameAr,
  fullNameEn,
  hash,
  transaction,
  log,
}) {
  const normalizedEmail = required(email, "REVIEW_LAWYER_EMAIL").toLowerCase();
  const rawPassword = String(password ?? "");
  if (!rawPassword) throw new Error("REVIEW_LAWYER_PASSWORD is required");
  const normalizedRegistrationNo = required(
    registrationNo,
    "REVIEW_LAWYER_REGISTRATION_NO",
  );
  const normalizedMembershipNo = required(
    membershipNo,
    "REVIEW_LAWYER_MEMBERSHIP_NO",
  );
  const normalizedPhone = required(phone, "REVIEW_LAWYER_PHONE");
  const normalizedFullNameAr = required(fullNameAr, "REVIEW_LAWYER_FULL_NAME_AR");
  const normalizedFullNameEn = required(fullNameEn, "REVIEW_LAWYER_FULL_NAME_EN");

  const account = {
    countryCode: "BH",
    email: normalizedEmail,
    passwordHash: await hash(rawPassword, 12),
    registrationNo: normalizedRegistrationNo,
    membershipNo: normalizedMembershipNo,
    phone: normalizedPhone,
    fullName: normalizedFullNameAr || normalizedFullNameEn,
    fullNameAr: normalizedFullNameAr,
    fullNameEn: normalizedFullNameEn,
    status: "approved",
    isActive: true,
    isEmergencyReady: true,
    profileCompleted: true,
    isReviewAccount: true,
  };

  await transaction(async ({
    countEmailMatches,
    countRegistrationNoMatches,
    countPhoneMatches,
    countMembershipNoMatches,
    countReviewAccounts,
    insertReviewLawyer,
  }) => {
    const [
      emailMatchCount,
      registrationNoMatchCount,
      phoneMatchCount,
      membershipNoMatchCount,
      reviewAccountCount,
    ] = await Promise.all([
      countEmailMatches(normalizedEmail),
      countRegistrationNoMatches(normalizedRegistrationNo),
      countPhoneMatches(normalizedPhone),
      countMembershipNoMatches(normalizedMembershipNo),
      countReviewAccounts(),
    ]);
    if (
      emailMatchCount !== 0 ||
      registrationNoMatchCount !== 0 ||
      phoneMatchCount !== 0 ||
      membershipNoMatchCount !== 0 ||
      reviewAccountCount !== 0
    ) {
      throw new Error("Refusing to create review lawyer: matching identity or review account already exists");
    }

    const insertedCount = await insertReviewLawyer(account);
    if (insertedCount !== 1) {
      throw new Error("Expected to create exactly one review lawyer");
    }
  });

  log(`Review lawyer account created for ${normalizedEmail}`);
}

async function main() {
  const connectionString = process.env.DATABASE_URL_UNPOOLED ?? process.env.DATABASE_URL;
  if (!connectionString) throw new Error("DATABASE_URL_UNPOOLED or DATABASE_URL is required");

  const sql = postgres(connectionString, { max: 1 });
  try {
    await createReviewLawyerAccount({
      email: process.env.REVIEW_LAWYER_EMAIL,
      password: process.env.REVIEW_LAWYER_PASSWORD,
      registrationNo: process.env.REVIEW_LAWYER_REGISTRATION_NO,
      membershipNo: process.env.REVIEW_LAWYER_MEMBERSHIP_NO,
      phone: process.env.REVIEW_LAWYER_PHONE,
      fullNameAr: process.env.REVIEW_LAWYER_FULL_NAME_AR,
      fullNameEn: process.env.REVIEW_LAWYER_FULL_NAME_EN,
      hash: bcrypt.hash,
      transaction: (operation) => beginSerializableTransaction(
        sql,
        async (transactionSql) => operation({
          countEmailMatches: async (normalizedEmail) => {
            const rows = await transactionSql`
              SELECT count(*)::integer AS count
              FROM public.bahrain_lawyers
              WHERE lower(trim(email)) = ${normalizedEmail}
            `;
            return rows[0]?.count ?? 0;
          },
          countRegistrationNoMatches: async (registrationNo) => {
            const rows = await transactionSql`
              SELECT count(*)::integer AS count
              FROM public.bahrain_lawyers
              WHERE registration_no = ${registrationNo}
            `;
            return rows[0]?.count ?? 0;
          },
          countPhoneMatches: async (phone) => {
            const rows = await transactionSql`
              SELECT count(*)::integer AS count
              FROM public.bahrain_lawyers
              WHERE phone = ${phone}
            `;
            return rows[0]?.count ?? 0;
          },
          countMembershipNoMatches: async (membershipNo) => {
            const rows = await transactionSql`
              SELECT count(*)::integer AS count
              FROM public.bahrain_lawyers
              WHERE membership_no = ${membershipNo}
            `;
            return rows[0]?.count ?? 0;
          },
          countReviewAccounts: async () => {
            const rows = await transactionSql`
              SELECT count(*)::integer AS count
              FROM public.bahrain_lawyers
              WHERE is_review_account = true
            `;
            return rows[0]?.count ?? 0;
          },
          insertReviewLawyer: async (account) => {
            const rows = await transactionSql`
              INSERT INTO public.bahrain_lawyers (
                country_code,
                full_name,
                full_name_ar,
                full_name_en,
                registration_no,
                membership_no,
                phone,
                email,
                password_hash,
                status,
                is_active,
                is_emergency_ready,
                profile_completed,
                is_review_account
              ) VALUES (
                ${account.countryCode},
                ${account.fullName},
                ${account.fullNameAr},
                ${account.fullNameEn},
                ${account.registrationNo},
                ${account.membershipNo},
                ${account.phone},
                ${account.email},
                ${account.passwordHash},
                ${account.status},
                ${account.isActive},
                ${account.isEmergencyReady},
                ${account.profileCompleted},
                ${account.isReviewAccount}
              )
              RETURNING id
            `;
            return rows.length;
          },
        }),
      ),
      log: console.log,
    });
  } finally {
    await sql.end();
  }
}

if (process.argv[1] && pathToFileURL(process.argv[1]).href === import.meta.url) {
  main().catch((error) => {
    console.error(error instanceof Error ? error.message : "Review lawyer creation failed");
    process.exitCode = 1;
  });
}
