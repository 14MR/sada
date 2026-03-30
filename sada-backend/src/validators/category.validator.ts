import { z } from "zod";

export const categorySlugSchema = z.object({
    slug: z.string({ message: "slug is required" }).min(1),
});
