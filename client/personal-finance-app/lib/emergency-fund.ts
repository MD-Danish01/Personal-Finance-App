import { z } from "zod";
import { integerPaise, positivePaise } from "./validation";

const emergencyFundFields = {
  targetAmount: positivePaise,
  currentAmount: integerPaise,
};

export const emergencyFundCreateSchema = z
  .object(emergencyFundFields)
  .strict();

export const emergencyFundUpdateSchema = z
  .object(emergencyFundFields)
  .partial()
  .strict()
  .refine((value) => Object.keys(value).length > 0, "At least one field is required");

export const emergencyContributionCreateSchema = z
  .object({
    amount: positivePaise,
    note: z.string().max(2000).nullable().optional(),
    contributedAt: z.string().datetime({ offset: true }).optional(),
  })
  .strict();

export const emergencyContributionUpdateSchema = z
  .object({
    amount: positivePaise,
    note: z.string().max(2000).nullable(),
    contributedAt: z.string().datetime({ offset: true }),
  })
  .partial()
  .strict()
  .refine((value) => Object.keys(value).length > 0, "At least one field is required");

export const emergencyContributionIdSchema = z.string().uuid();

export function adjustEmergencyFundAmount(currentAmount: number, delta: number) {
  const nextAmount = BigInt(currentAmount) + BigInt(delta);
  if (nextAmount < BigInt(0) || nextAmount > BigInt(2_147_483_647)) {
    return null;
  }
  return Number(nextAmount);
}

export function isEmergencyFundSnapshotConsistent(
  currentAmount: number,
  contributionsTotal: number,
) {
  return currentAmount >= contributionsTotal;
}

export function calculateEmergencyFundProgress(
  targetAmount: number,
  currentAmount: number,
) {
  const target = BigInt(targetAmount);
  const current = BigInt(currentAmount);
  const boundedCurrent = current > target ? target : current;

  return {
    contributedAmount: currentAmount,
    remainingAmount: Number(target > current ? target - current : BigInt(0)),
    progressPercent: target > BigInt(0)
      ? Math.min(Number((boundedCurrent * BigInt(100)) / target), 100)
      : 0,
  };
}

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
