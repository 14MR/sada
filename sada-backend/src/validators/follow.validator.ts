import { z } from "zod";

export const followBodySchema = z.object({
    userId: z.string({ message: "userId is required" }),
});
