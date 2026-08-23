import { z } from "zod";
import { positivePaise } from "./validation";

const profileFields = {
  monthlyIncome: positivePaise,
  currency: z.string().trim().min(1).max(10),
  essentialsPercent: z.number().int().min(0).max(100),
  savingsPercent: z.number().int().min(0).max(100),
  enjoymentPercent: z.number().int().min(0).max(100),
  bufferPercent: z.number().int().min(0).max(100),
  emergencyMonthsTarget: z.number().int().positive().max(120),
  onboardingCompleted: z.boolean(),
};

export const profileCreateSchema = z.object({
  monthlyIncome: profileFields.monthlyIncome,
  currency: profileFields.currency.optional(),
  essentialsPercent: profileFields.essentialsPercent.optional(),
  savingsPercent: profileFields.savingsPercent.optional(),
  enjoymentPercent: profileFields.enjoymentPercent.optional(),
  bufferPercent: profileFields.bufferPercent.optional(),
  emergencyMonthsTarget: profileFields.emergencyMonthsTarget.optional(),
  onboardingCompleted: profileFields.onboardingCompleted.optional(),
}).strict();

export const profileUpdateSchema = z
  .object(profileFields)
  .partial()
  .strict()
  .refine((value) => Object.keys(value).length > 0, "At least one field is required");

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
