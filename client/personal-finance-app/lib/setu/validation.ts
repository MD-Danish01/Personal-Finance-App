import { z } from "zod";

const isoDateTime = z.string().datetime({ offset: true });

export const consentRequestSchema = z
  .object({
    vua: z.string().trim().min(1).max(200),
    consentDuration: z
      .object({
        unit: z.enum(["MONTH", "YEAR", "DAY"]),
        value: z.number().int().positive(),
      })
      .optional(),
    consentDateRange: z
      .object({ startDate: isoDateTime, endDate: isoDateTime })
      .optional(),
    fetchType: z.enum(["ONETIME", "PERIODIC"]),
    consentTypes: z
      .array(z.enum(["PROFILE", "SUMMARY", "TRANSACTIONS"]))
      .min(1),
    dataRange: z.object({ from: isoDateTime, to: isoDateTime }),
    fiTypes: z.tuple([z.literal("DEPOSIT")]),
    consentMode: z.enum(["VIEW", "STORE", "QUERY", "STREAM"]),
    dataLife: z.object({
      unit: z.enum(["MONTH", "YEAR", "DAY", "INF"]),
      value: z.number().int().positive(),
    }),
    purpose: z.object({
      code: z.enum(["101", "102", "103", "104", "105"]),
      text: z.string().trim().min(1).max(500),
      category: z.string().max(100).nullable().optional(),
      refUri: z.string().url().optional(),
    }),
    frequency: z
      .object({
        unit: z.enum(["HOURLY", "DAILY", "MONTHLY", "YEARLY"]),
        value: z.number().int().positive(),
      })
      .optional(),
    dataFilter: z.array(z.unknown()).optional(),
    context: z.array(z.unknown()).optional(),
    additionalParams: z.object({ tags: z.array(z.string().max(100)).optional() }).optional(),
    enableAdditionalPhoneNumber: z.boolean().optional(),
  })
  .strict()
  .refine(
    (value) => Boolean(value.consentDuration) !== Boolean(value.consentDateRange),
    "Provide exactly one of consentDuration or consentDateRange",
  )
  .refine(
    (value) => value.consentTypes.includes("TRANSACTIONS"),
    "Transactions consent is required for this integration",
  );

export const dataSessionRequestSchema = z
  .object({
    consentId: z.string().min(1).max(200),
    from: isoDateTime,
    to: isoDateTime,
  })
  .strict();
