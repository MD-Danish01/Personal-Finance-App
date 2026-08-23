import { z } from "zod";
import { positivePaise } from "./validation";

const categories = [
  "Food",
  "Transport",
  "Shopping",
  "Entertainment",
  "Bills",
  "Others",
] as const;

const transactionTypes = ["expense", "income"] as const;
const financialBuckets = [
  "essentials",
  "enjoyment",
  "emergency",
  "future_savings",
  "long_term_wealth",
  "buffer",
  "unknown",
] as const;
const datePattern = /^\d{4}-\d{2}-\d{2}$/;

const validDate = z.string().refine(
  (value) => {
    if (!datePattern.test(value)) return false;
    const date = new Date(`${value}T00:00:00Z`);
    return !Number.isNaN(date.getTime()) && date.toISOString().startsWith(value);
  },
  "Date must be a valid YYYY-MM-DD value",
);

export const transactionCreateSchema = z.object({
  amount: positivePaise,
  type: z.enum(transactionTypes),
  category: z.enum(categories),
  financialBucket: z.enum(financialBuckets).optional(),
  merchant: z.string().max(200).optional().default(""),
  description: z.string().max(2000).nullable().optional(),
  transactionDate: validDate,
}).strict();

export const transactionUpdateSchema = transactionCreateSchema
  .partial()
  .strict()
  .refine((value) => Object.keys(value).length > 0, "At least one field is required");

export const transactionIdSchema = z.string().uuid();

export const transactionQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).default(50),
  offset: z.coerce.number().int().min(0).default(0),
  category: z.enum(categories).optional(),
  type: z.enum(transactionTypes).optional(),
  dateFrom: validDate.optional(),
  dateTo: validDate.optional(),
}).strict();

export function validationError(error: z.ZodError) {
  return Response.json(
    { error: "Invalid request", details: error.flatten().fieldErrors },
    { status: 400 },
  );
}
