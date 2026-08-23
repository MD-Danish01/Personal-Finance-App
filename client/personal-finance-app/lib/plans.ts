import { z } from "zod";
import { integerPaise, positivePaise } from "./validation";

const allocationKeys = [
  "essentials",
  "enjoyment",
  "emergency",
  "future_savings",
  "long_term_wealth",
  "buffer",
] as const;

const planStatuses = ["draft", "recommended", "active"] as const;

const allocationSchema = z
  .object({
    key: z.enum(allocationKeys),
    amount: integerPaise,
    percent: z.number().int().min(0).max(100),
  })
  .strict();

const planFields = {
  month: z.number().int().min(1).max(12),
  year: z.number().int().min(1900).max(2200),
  monthlyIncome: positivePaise,
  status: z.enum(planStatuses),
  whyThisPlan: z.string().max(5000).nullable(),
};

export const planCreateSchema = z
  .object({
    month: planFields.month,
    year: planFields.year,
    monthlyIncome: planFields.monthlyIncome,
    status: planFields.status.optional(),
    whyThisPlan: planFields.whyThisPlan.optional(),
    allocations: z.array(allocationSchema).optional(),
  })
  .strict();

export const planUpdateSchema = z
  .object({
    month: planFields.month,
    year: planFields.year,
    monthlyIncome: planFields.monthlyIncome,
    status: planFields.status,
    whyThisPlan: planFields.whyThisPlan,
    allocations: z.array(allocationSchema),
  })
  .strict()
  .partial()
  .refine((value) => Object.keys(value).length > 0, "At least one field is required");

export const planIdSchema = z.string().uuid();

export function validationError(error: z.ZodError) {
  return Response.json(
    { error: "Invalid request", details: error.flatten().fieldErrors },
    { status: 400 },
  );
}

export function isUniqueViolation(error: unknown) {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    error.code === "23505"
  );
}
