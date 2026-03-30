import { vars } from "../config/env";
import logger from "../config/logger";

export class AudioService {
    // Helper to fetch ICE servers from Cloudflare
    private static async getIceServers() {
        const { turnKeyId, apiToken } = vars.cloudflare;
        const url = `https://rtc.live.cloudflare.com/v1/turn/keys/${turnKeyId}/credentials/generate-ice-servers`;

        try {
            const response = await fetch(url, {
                method: "POST",
                headers: {
                    "Authorization": `Bearer ${apiToken}`,
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({ ttl: 86400 })
            });

            if (!response.ok) {
                const text = await response.text();
                logger.error({ text }, "Cloudflare TURN Error");
                return []; // Fallback or throw
            }

            const data = await response.json();
            return data.iceServers;
        } catch (error) {
            logger.error({ err: error }, "Failed to fetch ICE servers");
            return [];
        }
    }

    // Mock Cloudflare RealtimeKit or similar provider
    static async createSession(roomId: string, hostId: string) {
        // App ID provided by user
        const { appId } = vars.cloudflare;

        // TODO: To generate real sessions/tokens, we need the Cloudflare Realtime App Secret.
        // For now, we return valid-looking config using the real App ID.
        logger.debug({ roomId, hostId }, "Creating session");

        const iceServers = await this.getIceServers();

        return {
            provider: "cloudflare-calls",
            sessionId: `sess_${roomId}`,
            appId: appId,
            iceServers: iceServers,
            connectionDetails: {
                // In a real app, this would be the actual Cloudflare Calls API endpoint or similar
                websocketUrl: `wss://rtc.live.cloudflare.com/v1/apps/${appId}/sessions/sess_${roomId}`,
                token: `mock_token_needing_secret_key`
            }
        };
    }

    static async generateToken(roomId: string, userId: string, role: string) {
        const { appId } = vars.cloudflare;
        logger.debug({ roomId, userId, role }, "Generating token");

        const iceServers = await this.getIceServers();

        return {
            iceServers: iceServers,
            connectionDetails: {
                websocketUrl: `wss://rtc.live.cloudflare.com/v1/apps/${appId}/sessions/sess_${roomId}`,
                // A real token requires signing with the App Secret
                token: `mock_${role}_token_${userId}`
            }
        };
    }
}
