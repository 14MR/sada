import { z } from "zod";
import { NotificationPreferenceType } from "../models/NotificationPreference";

const preferenceEntrySchema = z.object({
    type: z.enum(Object.values(NotificationPreferenceType) as [string, ...string[]], {
        message: `Invalid type. Valid: ${Object.values(NotificationPreferenceType).join(", ")}`,
    }),
    enabled: z.boolean(),
});

export const bulkUpdatePreferencesSchema = z.object({
    preferences: z.array(preferenceEntrySchema).min(1, "At least one preference is required"),
});
