import type { SarayaRole } from "@/lib/db/saraya-schema";
import {
  ApiError,
  validatedEmail,
  validatedPhone,
} from "../auth/contracts";

export interface AccountMembership {
  propertyId: string;
  propertyNameAr: string;
  propertyNameEn: string;
  role: SarayaRole;
}

export interface AccountRecord {
  id: string;
  displayNameAr: string;
  displayNameEn: string;
  email: string | null;
  phone: string | null;
  passwordHash: string | null;
  memberships: AccountMembership[];
}

export interface AccountProjection {
  id: string;
  displayNameAr: string;
  displayNameEn: string;
  email: string | null;
  phone: string | null;
  memberships: AccountMembership[];
}

export interface AccountUpdateInput {
  displayNameAr: string;
  displayNameEn: string;
  email?: string | null;
  phone?: string | null;
  currentPassword?: string;
}

export interface ChangePasswordInput {
  currentPassword: string;
  newPassword: string;
}

export interface AccountDependencies {
  find(userId: string): Promise<AccountRecord | null>;
  update(
    userId: string,
    input: Pick<
      AccountRecord,
      "displayNameAr" | "displayNameEn" | "email" | "phone"
    >,
  ): Promise<AccountRecord>;
  verify(password: string, passwordHash: string): Promise<boolean>;
  hash(password: string): Promise<string>;
  changePasswordAndRevokeOthers(
    userId: string,
    currentSessionId: string,
    passwordHash: string,
  ): Promise<void>;
}

const requiredText = (value: string, field: string) => {
  const normalized = value.trim();
  if (!normalized) {
    throw new ApiError(
      422,
      "VALIDATION_ERROR",
      "تحقق من الحقول المطلوبة",
      "Check the required fields",
      { [field]: ["REQUIRED"] },
    );
  }
  return normalized;
};

const optionalEmail = (value?: string | null) => {
  const trimmed = value?.trim() ?? "";
  return trimmed ? validatedEmail(trimmed) : null;
};

const optionalPhone = (value?: string | null) => {
  const trimmed = value?.trim() ?? "";
  return trimmed ? validatedPhone(trimmed) : null;
};

const projection = (record: AccountRecord): AccountProjection => ({
  id: record.id,
  displayNameAr: record.displayNameAr,
  displayNameEn: record.displayNameEn,
  email: record.email,
  phone: record.phone,
  memberships: record.memberships.map((membership) => ({
    propertyId: membership.propertyId,
    propertyNameAr: membership.propertyNameAr,
    propertyNameEn: membership.propertyNameEn,
    role: membership.role,
  })),
});

const notFound = () =>
  new ApiError(404, "ACCOUNT_NOT_FOUND", "الحساب غير موجود", "Account not found");

const invalidCurrentPassword = () =>
  new ApiError(
    401,
    "INVALID_CURRENT_PASSWORD",
    "كلمة المرور الحالية غير صحيحة",
    "Current password is incorrect",
  );

export function createAccountService(deps: AccountDependencies) {
  const requiredAccount = async (userId: string) => {
    const record = await deps.find(userId);
    if (!record) throw notFound();
    return record;
  };

  return {
    async get(userId: string) {
      return projection(await requiredAccount(userId));
    },

    async update(userId: string, input: AccountUpdateInput) {
      const current = await requiredAccount(userId);
      const update = {
        displayNameAr: requiredText(input.displayNameAr, "displayNameAr"),
        displayNameEn: requiredText(input.displayNameEn, "displayNameEn"),
        email: optionalEmail(input.email),
        phone: optionalPhone(input.phone),
      };
      if (!update.email && !update.phone) {
        throw new ApiError(
          422,
          "IDENTITY_REQUIRED",
          "البريد الإلكتروني أو رقم الهاتف مطلوب",
          "Email or phone is required",
        );
      }
      const identityChanged =
        update.email !== current.email || update.phone !== current.phone;
      if (identityChanged && !input.currentPassword) {
        throw new ApiError(
          422,
          "CURRENT_PASSWORD_REQUIRED",
          "كلمة المرور الحالية مطلوبة",
          "Current password is required",
        );
      }
      if (
        identityChanged &&
        (!current.passwordHash ||
          !(await deps.verify(input.currentPassword!, current.passwordHash)))
      ) {
        throw invalidCurrentPassword();
      }
      return projection(await deps.update(userId, update));
    },

    async changePassword(
      userId: string,
      currentSessionId: string,
      input: ChangePasswordInput,
    ) {
      const current = await requiredAccount(userId);
      if (
        !current.passwordHash ||
        !(await deps.verify(input.currentPassword, current.passwordHash))
      ) {
        throw invalidCurrentPassword();
      }
      const passwordHash = await deps.hash(input.newPassword);
      await deps.changePasswordAndRevokeOthers(
        userId,
        currentSessionId,
        passwordHash,
      );
    },
  };
}
