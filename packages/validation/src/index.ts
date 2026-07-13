import { z } from "zod";

export * from "./domain";

export const idSchema = z.string().min(1).max(120);

export const foundationOnlySchema = z.object({
  foundationOnly: z.literal(true)
});
