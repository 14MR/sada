import { z } from "zod";

// Follow/unfollow no longer require userId in body — identity comes from auth token.
// Keep the schema to allow extra fields (Zod strips unknowns by default).
export const followBodySchema = z.object({});
