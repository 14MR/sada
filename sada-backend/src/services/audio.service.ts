import { CallsService } from "./calls.service";
import logger from "../config/logger";

/**
 * AudioService - thin facade over CallsService.
 *
 * Kept for backward compatibility with room.service.ts which calls
 * `AudioService.createSession()` and `AudioService.generateToken()`.
 * All heavy lifting now delegates to CallsService (Cloudflare Calls SFU).
 */
export class AudioService {
    /**
     * Create a new SFU audio session for a room (called by host when going live).
     */
    static async createSession(roomId: string, hostId: string) {
        logger.debug({ roomId, hostId }, "AudioService.createSession");

        const session = await CallsService.createSession(roomId, hostId);
        const iceServers = await CallsService.getIceServers();

        return {
            provider: "cloudflare-calls",
            sessionId: session.sessionId,
            appId: undefined, // clients don't need this; backend proxies all API calls
            iceServers,
        };
    }

    /**
     * Generate a connection token / details for a participant joining a room.
     * The actual SDP exchange now happens via the /audio/sessions/:id/join endpoint,
     * but we keep this for backward compatibility with room.service.ts.
     */
    static async generateToken(roomId: string, userId: string, role: string) {
        logger.debug({ roomId, userId, role }, "AudioService.generateToken (legacy)");

        const session = CallsService.getSessionByRoom(roomId);
        if (!session) {
            // Session not created yet — return ICE servers only; client will
            // call the new join endpoint to do the full SDP exchange.
            const iceServers = await CallsService.getIceServers();
            return {
                iceServers,
                sessionId: null,
            };
        }

        const iceServers = await CallsService.getIceServers();
        return {
            iceServers,
            sessionId: session.sessionId,
        };
    }
}
