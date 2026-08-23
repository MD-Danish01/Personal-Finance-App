import { z } from "zod";

export const MAX_INTEGER_PAISE = 2_147_483_647;
export const integerPaise = z.number().int().min(0).max(MAX_INTEGER_PAISE);
export const positivePaise = integerPaise.positive();
