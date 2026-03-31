import { z } from "zod";
import { PresenceStatus } from "../models/UserPresence";

export const updatePresenceSchema = z.object({
    status: z.enum([PresenceStatus.ONLINE, PresenceStatus.AWAY, PresenceStatus.OFFLINE], {
        message: `Invalid status. Valid: ${Object.values(PresenceStatus).join(", ")}`,
    }),
    currentRoomId: z.string().nullable().optional(),
});
