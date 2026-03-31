import { vars } from "../config/env";

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
                console.error("Cloudflare TURN Error:", text);
                return []; // Fallback or throw
            }

            const data = await response.json();
            return data.iceServers;
        } catch (error) {
            console.error("Failed to fetch ICE servers:", error);
            return [];
        }
    }

    static async getAudioConfig(roomId: string) {
        console.log(`[AudioService] Getting audio config for room ${roomId}`);

        const iceServers = await this.getIceServers();

        return {
            architecture: 'p2p-mesh',
            iceServers: iceServers,
            maxSpeakers: 5
        };
    }
}
