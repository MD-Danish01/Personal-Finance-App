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

const limitFields = {
  category: z.enum(categories),
  monthlyLimit: positivePaise,
};

export const limitCreateSchema = z.object(limitFields).strict();

export const limitUpdateSchema = z
  .object(limitFields)
  .partial()
  .strict()
  .refine((value) => Object.keys(value).length > 0, "At least one field is required");

export const limitIdSchema = z.string().uuid();

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
