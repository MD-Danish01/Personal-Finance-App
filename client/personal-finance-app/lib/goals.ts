import { z } from "zod";
import { integerPaise, positivePaise } from "./validation";

const goalStatuses = ["on_track", "at_risk", "completed"] as const;

const dateOnly = z.string().refine(
  (value) => {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
    const parsed = new Date(`${value}T00:00:00Z`);
    return !Number.isNaN(parsed.getTime()) && parsed.toISOString().startsWith(value);
  },
  "Date must be a valid YYYY-MM-DD value",
);

const goalFields = {
  name: z.string().trim().min(1).max(200),
  icon: z.string().trim().min(1).max(50),
  targetAmount: positivePaise,
  deadline: dateOnly.nullable(),
  monthlyTarget: integerPaise,
  status: z.enum(goalStatuses),
};

export const goalCreateSchema = z
  .object({
    name: goalFields.name,
    icon: goalFields.icon.optional(),
    targetAmount: goalFields.targetAmount,
    deadline: goalFields.deadline.optional(),
    monthlyTarget: goalFields.monthlyTarget.optional(),
    status: goalFields.status.optional(),
  })
  .strict();

export const goalUpdateSchema = z
  .object(goalFields)
  .partial()
  .strict()
  .refine((value) => Object.keys(value).length > 0, "At least one field is required");

export const contributionCreateSchema = z
  .object({
    amount: positivePaise,
    note: z.string().max(2000).nullable().optional(),
    contributedAt: z.string().datetime({ offset: true }).optional(),
  })
  .strict();

export const contributionUpdateSchema = z
  .object({
    amount: positivePaise,
    note: z.string().max(2000).nullable(),
    contributedAt: z.string().datetime({ offset: true }),
  })
  .partial()
  .strict()
  .refine((value) => Object.keys(value).length > 0, "At least one field is required");

export const goalIdSchema = z.string().uuid();
export const contributionIdSchema = z.string().uuid();

export function calculateGoalProgress(
  targetAmount: number,
  contributions: readonly { amount: number }[],
) {
  const target = BigInt(targetAmount);
  const contributed = contributions.reduce(
    (total, contribution) => total + BigInt(contribution.amount),
    BigInt(0),
  );
  const boundedContributed = contributed > target ? target : contributed;
  const remaining = target > contributed ? target - contributed : BigInt(0);
  const progressPercent = target > BigInt(0)
    ? Number((boundedContributed * BigInt(100)) / target)
    : 0;

  return {
    contributedAmount: Number(contributed),
    remainingAmount: Number(remaining),
    progressPercent: Math.min(progressPercent, 100),
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
