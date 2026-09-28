import { z } from "zod";
import { isCountryCode } from "./countries";

export const sosRequestSchema = z.object({
  country: z.string().refine(isCountryCode),
  category: z.string().uuid(),
  name: z.string().trim().min(2).max(100),
  phone: z.string().regex(/^\+[1-9]\d{6,14}$/),
  phoneDialCode: z.string().regex(/^[1-9]\d{0,3}$/),
  description: z.string().trim().max(2000).optional().default(""),
  acceptedTerms: z.literal(true),
  idempotencyKey: z.string().uuid(),
}).refine(({ phone, phoneDialCode }) => phone.startsWith("+" + phoneDialCode) &&
  phone.length - phoneDialCode.length - 1 >= 4);

export type SosRequestInput = z.input<typeof sosRequestSchema>;
