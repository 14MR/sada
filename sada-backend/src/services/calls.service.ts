import { vars } from "../config/env";
import logger from "../config/logger";

const CALLS_BASE = "https://rtc.live.cloudflare.com/v1/apps";

// ─── Types ───────────────────────────────────────────────────────────────────

interface SessionInfo {
    sessionId: string;
    roomId: string;
    hostId: string;
    participants: Map<string, ParticipantInfo>;
    createdAt: Date;
}

interface ParticipantInfo {
    userId: string;
    trackId: string;
    mid: string;
    role: "host" | "speaker" | "listener";
    joinedAt: Date;
    isMuted: boolean;
}

interface TrackResponse {
    sessionDescription: { sdp: string; type: string };
    trackId: string;
    mid: string;
}

// ─── In-memory session store ─────────────────────────────────────────────────

const sessions = new Map<string, SessionInfo>();       // sessionId → SessionInfo
const roomSessionIndex = new Map<string, string>();     // roomId → sessionId

// ─── Helpers ─────────────────────────────────────────────────────────────────

function callsUrl(path: string): string {
    return `${CALLS_BASE}/${vars.cloudflare.appId}${path}`;
}

function authHeaders(): Record<string, string> {
    return {
        Authorization: `Bearer ${vars.cloudflare.appSecret}`,
        "Content-Type": "application/json",
    };
}

// ─── Public API ──────────────────────────────────────────────────────────────

export class CallsService {
    /**
     * Create a new Cloudflare Calls SFU session for a room.
     * Called by the room host when starting a live room.
     */
    static async createSession(roomId: string, hostId: string): Promise<SessionInfo> {
        // If a session already exists for this room, return it
        const existingSessionId = roomSessionIndex.get(roomId);
        if (existingSessionId) {
            const existing = sessions.get(existingSessionId);
            if (existing) {
                logger.info({ roomId, sessionId: existingSessionId }, "Reusing existing SFU session");
                return existing;
            }
        }

        const url = callsUrl("/sessions/new");

        logger.info({ roomId, hostId, url }, "Creating Cloudflare Calls SFU session");

        const response = await fetch(url, {
            method: "POST",
            headers: authHeaders(),
            body: JSON.stringify({}),
        });

        if (!response.ok) {
            const text = await response.text();
            logger.error({ status: response.status, body: text, roomId }, "Failed to create Calls session");
            throw new Error(`Cloudflare Calls session creation failed: ${response.status}`);
        }

        const data = await response.json();
        const sessionId: string = data.sessionId;

        const session: SessionInfo = {
            sessionId,
            roomId,
            hostId,
            participants: new Map(),
            createdAt: new Date(),
        };

        sessions.set(sessionId, session);
        roomSessionIndex.set(roomId, sessionId);

        logger.info({ roomId, sessionId }, "SFU session created");
        return session;
    }

    /**
     * Create an upstream track for a participant joining the session.
     * The client provides an offer SDP; we forward it to Cloudflare and
     * return the answer SDP + track identifiers.
     */
    static async createTrack(
        sessionId: string,
        userId: string,
        offerSdp: string,
        role: "host" | "speaker" | "listener",
    ): Promise<{ answer: TrackResponse; session: SessionInfo }> {
        const session = sessions.get(sessionId);
        if (!session) {
            throw new Error(`Session ${sessionId} not found`);
        }

        const url = callsUrl(`/sessions/${sessionId}/tracks/new`);

        logger.info({ sessionId, userId, role }, "Creating upstream track via Calls API");

        const response = await fetch(url, {
            method: "POST",
            headers: authHeaders(),
            body: JSON.stringify({
                sessionDescription: { sdp: offerSdp, type: "offer" },
                mediaTypes: { audio: true, video: false },
            }),
        });

        if (!response.ok) {
            const text = await response.text();
            logger.error({ status: response.status, body: text, sessionId, userId }, "Failed to create track");
            throw new Error(`Cloudflare Calls track creation failed: ${response.status}`);
        }

        const data = await response.json();

        const answer: TrackResponse = {
            sessionDescription: data.sessionDescription,
            trackId: data.trackId,
            mid: data.mid,
        };

        // Record participant in session
        session.participants.set(userId, {
            userId,
            trackId: data.trackId,
            mid: data.mid,
            role,
            joinedAt: new Date(),
            isMuted: false,
        });

        logger.info({ sessionId, userId, trackId: data.trackId, mid: data.mid }, "Track created");
        return { answer, session };
    }

    /**
     * Handle renegotiation for an existing participant (e.g. ICE restart,
     * mute/unmute signalling, or track updates).
     */
    static async renegotiateTrack(
        sessionId: string,
        userId: string,
        offerSdp: string,
    ): Promise<TrackResponse> {
        const session = sessions.get(sessionId);
        if (!session) {
            throw new Error(`Session ${sessionId} not found`);
        }

        const participant = session.participants.get(userId);
        if (!participant) {
            throw new Error(`Participant ${userId} not found in session ${sessionId}`);
        }

        const url = callsUrl(`/sessions/${sessionId}/renegotiate`);

        logger.info({ sessionId, userId, trackId: participant.trackId }, "Renegotiating track");

        const response = await fetch(url, {
            method: "PUT",
            headers: authHeaders(),
            body: JSON.stringify({
                sessionDescription: { sdp: offerSdp, type: "offer" },
                trackId: participant.trackId,
            }),
        });

        if (!response.ok) {
            const text = await response.text();
            logger.error({ status: response.status, body: text }, "Renegotiate track failed");
            throw new Error(`Cloudflare Calls renegotiation failed: ${response.status}`);
        }

        const data = await response.json();

        return {
            sessionDescription: data.sessionDescription,
            trackId: data.trackId ?? participant.trackId,
            mid: data.mid ?? participant.mid,
        };
    }

    /**
     * Remove a participant from the session and clean up.
     * If the host leaves, the entire session is destroyed.
     */
    static async leaveSession(sessionId: string, userId: string): Promise<{ sessionEnded: boolean }> {
        const session = sessions.get(sessionId);
        if (!session) {
            logger.warn({ sessionId, userId }, "Leave called for unknown session");
            return { sessionEnded: false };
        }

        // Remove participant
        session.participants.delete(userId);
        logger.info({ sessionId, userId }, "Participant left SFU session");

        // If host left or no participants remain, destroy the session
        if (userId === session.hostId || session.participants.size === 0) {
            await this.destroySession(sessionId);
            return { sessionEnded: true };
        }

        return { sessionEnded: false };
    }

    /**
     * Destroy a Cloudflare Calls session and clean up in-memory state.
     */
    static async destroySession(sessionId: string): Promise<void> {
        const session = sessions.get(sessionId);
        if (!session) return;

        logger.info({ sessionId, roomId: session.roomId, remainingParticipants: session.participants.size }, "Destroying SFU session");

        // Best-effort: notify Cloudflare to close the session
        try {
            const url = callsUrl(`/sessions/${sessionId}`);
            await fetch(url, {
                method: "DELETE",
                headers: authHeaders(),
            });
        } catch (err) {
            logger.warn({ err, sessionId }, "Failed to delete session from Cloudflare (best-effort)");
        }

        // Clean up in-memory state
        roomSessionIndex.delete(session.roomId);
        sessions.delete(sessionId);
    }

    /**
     * Get session info for a given room.
     */
    static getSessionByRoom(roomId: string): SessionInfo | undefined {
        const sessionId = roomSessionIndex.get(roomId);
        if (!sessionId) return undefined;
        return sessions.get(sessionId);
    }

    /**
     * Get session info by session ID.
     */
    /**
     * List participants in a session.
     */
    static getParticipants(sessionId: string): ParticipantInfo[] {
        const session = sessions.get(sessionId);
        if (!session) return [];
        return Array.from(session.participants.values());
    }

    /**
     * Update a participant's mute state.
     */
    static setMuteState(sessionId: string, userId: string, muted: boolean): void {
        const session = sessions.get(sessionId);
        if (!session) return;
        const participant = session.participants.get(userId);
        if (participant) {
            participant.isMuted = muted;
        }
    }

    // ─── ICE Servers ─────────────────────────────────────────────────────

    /**
     * Fetch ICE servers from Cloudflare TURN.
     * Kept for backward compat and for clients that still need TURN fallback.
     */
    static async getIceServers() {
        const { turnKeyId, apiToken } = vars.cloudflare;
        const url = `https://rtc.live.cloudflare.com/v1/turn/keys/${turnKeyId}/credentials/generate-ice-servers`;

        try {
            const response = await fetch(url, {
                method: "POST",
                headers: {
                    Authorization: `Bearer ${apiToken}`,
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({ ttl: 86400 }),
            });

            if (!response.ok) {
                const text = await response.text();
                logger.error({ text }, "Cloudflare TURN Error");
                return [];
            }

            const data = await response.json();
            return data.iceServers;
        } catch (error) {
            logger.error({ err: error }, "Failed to fetch ICE servers");
            return [];
        }
    }
}
