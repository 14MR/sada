import { Request, Response } from "express";
import { CallsService } from "../services/calls.service";
import logger from "../config/logger";

/** Express 5 params are string | string[] – cast safely */
function param(req: Request, name: string): string {
    const value = req.params[name];
    return Array.isArray(value) ? value[0] : value;
}

export class AudioController {
    /**
     * POST /audio/sessions
     * Create a new SFU session for a room. Typically called by the room host.
     */
    static async createSession(req: Request, res: Response) {
        try {
            const userId = (req as any).user?.id;
            if (!userId) return res.status(401).json({ error: "Authentication required" });

            const { roomId } = req.body;

            const session = await CallsService.createSession(roomId, userId);
            const iceServers = await CallsService.getIceServers();

            return res.status(201).json({
                sessionId: session.sessionId,
                roomId: session.roomId,
                iceServers,
            });
        } catch (error) {
            logger.error({ err: error }, "Create audio session error");
            return res.status(500).json({ error: "Failed to create audio session" });
        }
    }

    /**
     * POST /audio/sessions/:sessionId/join
     * Join an existing SFU session. Client sends their offer SDP,
     * we forward to Cloudflare Calls, return the answer SDP.
     */
    static async joinSession(req: Request, res: Response) {
        try {
            const userId = (req as any).user?.id;
            if (!userId) return res.status(401).json({ error: "Authentication required" });

            const sessionId = param(req, "sessionId");
            const { offerSdp, role } = req.body;

            const { answer, session } = await CallsService.createTrack(
                sessionId,
                userId,
                offerSdp,
                role || "listener",
            );

            return res.json({
                answerSdp: answer.sessionDescription.sdp,
                answerType: answer.sessionDescription.type,
                trackId: answer.trackId,
                mid: answer.mid,
                sessionId: session.sessionId,
            });
        } catch (error: any) {
            logger.error({ err: error }, "Join audio session error");
            const status = error.message?.includes("not found") ? 404 : 500;
            return res.status(status).json({ error: error.message || "Failed to join audio session" });
        }
    }

    /**
     * POST /audio/sessions/:sessionId/leave
     * Leave an SFU session. If host leaves, session is destroyed.
     */
    static async leaveSession(req: Request, res: Response) {
        try {
            const userId = (req as any).user?.id;
            if (!userId) return res.status(401).json({ error: "Authentication required" });

            const sessionId = param(req, "sessionId");

            const result = await CallsService.leaveSession(sessionId, userId);
            return res.json({ success: true, sessionEnded: result.sessionEnded });
        } catch (error) {
            logger.error({ err: error }, "Leave audio session error");
            return res.status(500).json({ error: "Failed to leave audio session" });
        }
    }

    /**
     * GET /audio/sessions/:sessionId/participants
     * List participants in an SFU session.
     */
    static async getParticipants(req: Request, res: Response) {
        try {
            const sessionId = param(req, "sessionId");

            const participants = CallsService.getParticipants(sessionId);
            return res.json({ participants });
        } catch (error) {
            logger.error({ err: error }, "Get participants error");
            return res.status(500).json({ error: "Failed to get participants" });
        }
    }

    /**
     * POST /audio/sessions/:sessionId/renegotiate
     * Renegotiate a track (e.g. ICE restart).
     */
    static async renegotiate(req: Request, res: Response) {
        try {
            const userId = (req as any).user?.id;
            if (!userId) return res.status(401).json({ error: "Authentication required" });

            const sessionId = param(req, "sessionId");
            const { offerSdp } = req.body;

            const answer = await CallsService.renegotiateTrack(sessionId, userId, offerSdp);

            return res.json({
                answerSdp: answer.sessionDescription.sdp,
                answerType: answer.sessionDescription.type,
                trackId: answer.trackId,
                mid: answer.mid,
            });
        } catch (error: any) {
            logger.error({ err: error }, "Renegotiate error");
            const status = error.message?.includes("not found") ? 404 : 500;
            return res.status(status).json({ error: error.message || "Renegotiation failed" });
        }
    }

    /**
     * POST /audio/sessions/:sessionId/mute
     * Update mute state for a participant (local state only; actual mute is
     * handled by the client enabling/disabling the audio track).
     */
    static async setMuteState(req: Request, res: Response) {
        try {
            const userId = (req as any).user?.id;
            if (!userId) return res.status(401).json({ error: "Authentication required" });

            const sessionId = param(req, "sessionId");
            const { muted } = req.body;

            CallsService.setMuteState(sessionId, userId, muted);
            return res.json({ success: true });
        } catch (error) {
            logger.error({ err: error }, "Set mute state error");
            return res.status(500).json({ error: "Failed to set mute state" });
        }
    }

    /**
     * GET /audio/sessions/room/:roomId
     * Look up the active SFU session for a room.
     */
    static async getSessionByRoom(req: Request, res: Response) {
        try {
            const roomId = param(req, "roomId");
            const session = CallsService.getSessionByRoom(roomId);

            if (!session) {
                return res.status(404).json({ error: "No active session for this room" });
            }

            return res.json({
                sessionId: session.sessionId,
                roomId: session.roomId,
                hostId: session.hostId,
                participantCount: session.participants.size,
                createdAt: session.createdAt,
            });
        } catch (error) {
            logger.error({ err: error }, "Get session by room error");
            return res.status(500).json({ error: "Failed to get session" });
        }
    }
}
