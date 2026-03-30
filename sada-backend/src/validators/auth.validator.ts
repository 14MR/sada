import { z } from "zod";

export const signinSchema = z.object({
    identityToken: z.string({ message: "identityToken is required" }).min(1, "identityToken is required"),
    fullName: z.string().optional(),
});
