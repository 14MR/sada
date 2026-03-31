import { z } from "zod";

export const adminUsersQuerySchema = z.object({
    limit: z.coerce.number().int().min(1).max(100).default(20),
    offset: z.coerce.number().int().min(0).default(0),
    search: z.string().optional(),
    sort: z.enum(["created_at", "username", "gem_balance"]).default("created_at"),
    order: z.enum(["ASC", "DESC"]).default("DESC"),
    banned: z.enum(["true", "false"]).optional().transform(v => v === "true"),
    flagged: z.enum(["true", "false"]).optional().transform(v => v === "true"),
    is_creator: z.enum(["true", "false"]).optional().transform(v => v === "true"),
});

export const adminPatchUserSchema = z.object({
    banned: z.boolean().optional(),
    verified: z.boolean().optional(),
    is_creator: z.boolean().optional(),
}).refine(data => Object.keys(data).length > 0, {
    message: "At least one field must be provided",
});

export const adminStatsQuerySchema = z.object({
    // reserved for future filters
});
