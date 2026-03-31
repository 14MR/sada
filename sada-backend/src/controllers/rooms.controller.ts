import { Request, Response } from "express";
import { RoomService } from "../services/room.service";
import { InviteService } from "../services/invite.service";
import { RecommendationService } from "../services/recommendation.service";
import { ClipService } from "../services/clip.service";
import logger from "../config/logger";

export class RoomController {
    static async create(req: Request, res: Response) {
        try {
            const userId = (req as any).user?.id;
            if (!userId) return res.status(401).json({ error: "Authentication required" });

            const { title, categoryId, description, scheduledAt } = req.body;

            const { UserService } = require("../services/user.service");
            const host = await UserService.getProfile(userId);

            if (!host) return res.status(404).json({ error: "Host not found" });

            const room = await RoomService.createRoom(host, title, categoryId, description, scheduledAt ? new Date(scheduledAt) : undefined);
            return res.status(201).json(room);
        } catch (error) {
            logger.error({ err: error }, "Create Room Error");
            return res.status(500).json({ error: "Failed to create room" });
        }
    }

    static async list(req: Request, res: Response) {
        try {
            const category = req.query.category as string;
            const status = req.query.status as string || 'live';
            const limit = parseInt(req.query.limit as string) || 50;
            const offset = parseInt(req.query.offset as string) || 0;
            const rooms = await RoomService.getLiveRooms(category, status, limit, offset);
            return res.json(rooms);
        } catch (error) {
            logger.error({ err: error }, "List Rooms Error");
            return res.status(500).json({ error: "Failed to list rooms" });
        }
    }

    static async search(req: Request, res: Response) {
        try {
            const q = req.query.q as string;
            if (!q) return res.status(400).json({ error: "Search query required" });
            const rooms = await RoomService.searchRooms(q);
            return res.json(rooms);
        } catch (error) {
            logger.error({ err: error }, "Search Rooms Error");
            return res.status(500).json({ error: "Failed to search rooms" });
        }
    }

    static async get(req: Request, res: Response) {
        try {
            const id = req.params.id as string;
            const room = await RoomService.getRoom(id);
            if (!room) return res.status(404).json({ error: "Room not found" });
            return res.json(room);
        } catch (error) {
            return res.status(500).json({ error: "Failed to get room" });
        }
    }

    static async join(req: Request, res: Response) {
        try {
            const id = req.params.id as string;
            const userId = (req as any).user?.id;
            if (!userId) return res.status(401).json({ error: "Authentication required" });

            const { UserService } = require("../services/user.service");
            const user = await UserService.getProfile(userId);
            if (!user) return res.status(404).json({ error: "User not found" });

            const result = await RoomService.joinRoom(user, id);
            return res.json(result);
        } catch (error: any) {
            return res.status(400).json({ error: error.message });
        }
    }

    static async leave(req: Request, res: Response) {
        try {
            const id = req.params.id as string;
            const userId = (req as any).user?.id;
            if (!userId) return res.status(401).json({ error: "Authentication required" });

            await RoomService.leaveRoom(userId, id);
            return res.json({ success: true });
        } catch (error) {
            return res.status(500).json({ error: "Failed to leave room" });
        }
    }

    static async manageSpeaker(req: Request, res: Response) {
        try {
            const id = req.params.id as string;
            const requesterId = (req as any).user?.id;
            if (!requesterId) return res.status(401).json({ error: "Authentication required" });

            const { targetUserId, role } = req.body;

            if (!targetUserId || !role) {
                return res.status(400).json({ error: "Missing targetUserId or role" });
            }

            const updatedParticipant = await RoomService.updateParticipantRole(requesterId, id, targetUserId, role);
            return res.json(updatedParticipant);
        } catch (error: any) {
            return res.status(400).json({ error: error.message });
        }
    }

    static async end(req: Request, res: Response) {
        try {
            const id = req.params.id as string;
            const userId = (req as any).user?.id;
            if (!userId) return res.status(401).json({ error: "Authentication required" });

            await RoomService.endRoom(userId, id);
            return res.json({ success: true });
        } catch (error: any) {
            return res.status(400).json({ error: error.message });
        }
    }

    // ── Scheduled Rooms ──────────────────────────────────────────────

    static async schedule(req: Request, res: Response) {
        try {
            const userId = (req as any).user?.id;
            if (!userId) return res.status(401).json({ error: "Authentication required" });

            const { title, description, categoryId, scheduledAt } = req.body;

            const { UserService } = require("../services/user.service");
            const host = await UserService.getProfile(userId);
            if (!host) return res.status(404).json({ error: "Host not found" });

            const room = await RoomService.scheduleRoom(host, title, description, categoryId, new Date(scheduledAt));
            return res.status(201).json(room);
        } catch (error: any) {
            if (error.message.includes("future date") || error.message.includes("Category not found")) {
                return res.status(400).json({ error: error.message });
            }
            logger.error({ err: error }, "Schedule Room Error");
            return res.status(500).json({ error: "Failed to schedule room" });
        }
    }

    static async listScheduled(req: Request, res: Response) {
        try {
            const limit = parseInt(req.query.limit as string) || 20;
            const offset = parseInt(req.query.offset as string) || 0;
            const category = req.query.category as string | undefined;

            const result = await RoomService.getScheduledRooms(limit, offset, category);
            return res.json(result);
        } catch (error) {
            logger.error({ err: error }, "List Scheduled Rooms Error");
            return res.status(500).json({ error: "Failed to list scheduled rooms" });
        }
    }

    static async start(req: Request, res: Response) {
        try {
            const id = req.params.id as string;
            const userId = (req as any).user?.id;
            if (!userId) return res.status(401).json({ error: "Authentication required" });

            const result = await RoomService.startScheduledRoom(userId, id);
            return res.json(result);
        } catch (error: any) {
            if (error.message.includes("not in scheduled") || error.message.includes("Only the host")) {
                return res.status(400).json({ error: error.message });
            }
            if (error.message === "Room not found") {
                return res.status(404).json({ error: error.message });
            }
            logger.error({ err: error }, "Start Scheduled Room Error");
            return res.status(500).json({ error: "Failed to start room" });
        }
    }

    // ── Trending / Discovery ─────────────────────────────────────────

    static async trending(req: Request, res: Response) {
        try {
            const limit = parseInt(req.query.limit as string) || 20;
            const offset = parseInt(req.query.offset as string) || 0;

            const rooms = await RoomService.getTrendingRooms(limit, offset);
            return res.json(rooms);
        } catch (error) {
            logger.error({ err: error }, "Trending Rooms Error");
            return res.status(500).json({ error: "Failed to get trending rooms" });
        }
    }

    static async listByCategory(req: Request, res: Response) {
        try {
            const slug = req.params.slug as string;
            const limit = parseInt(req.query.limit as string) || 20;
            const offset = parseInt(req.query.offset as string) || 0;

            const result = await RoomService.getRoomsByCategory(slug, limit, offset);
            return res.json(result);
        } catch (error) {
            logger.error({ err: error }, "Category Rooms Error");
            return res.status(500).json({ error: "Failed to get rooms by category" });
        }
    }

    // ── Room Invites ────────────────────────────────────────────────

    static async createInvite(req: Request, res: Response) {
        try {
            const roomId = req.params.id as string;
            const userId = (req as any).user?.id;
            if (!userId) return res.status(401).json({ error: "Authentication required" });

            const { type, inviteeId, maxUses, expiresAt } = req.body;

            let invite;
            if (type === 'direct') {
                invite = await InviteService.createDirectInvite(userId, roomId, inviteeId);
            } else {
                invite = await InviteService.createLinkInvite(userId, roomId, maxUses, expiresAt ? new Date(expiresAt) : undefined);
            }

            return res.status(201).json(invite);
        } catch (error: any) {
            if (error.message.includes("not found") || error.message.includes("Only the host") || error.message.includes("not live") || error.message.includes("not active") || error.message.includes("yourself")) {
                return res.status(400).json({ error: error.message });
            }
            logger.error({ err: error }, "Create Invite Error");
            return res.status(500).json({ error: "Failed to create invite" });
        }
    }

    static async acceptInvite(req: Request, res: Response) {
        try {
            const code = req.params.code as string;
            const userId = (req as any).user?.id;
            if (!userId) return res.status(401).json({ error: "Authentication required" });

            const result = await InviteService.acceptInvite(userId, code);
            return res.json(result);
        } catch (error: any) {
            if (error.message.includes("not found") || error.message.includes("expired") || error.message.includes("maximum") || error.message.includes("not live") || error.message.includes("Cannot join") || error.message.includes("Invalid")) {
                return res.status(400).json({ error: error.message });
            }
            logger.error({ err: error }, "Accept Invite Error");
            return res.status(500).json({ error: "Failed to accept invite" });
        }
    }

    static async listInvites(req: Request, res: Response) {
        try {
            const roomId = req.params.id as string;
            const userId = (req as any).user?.id;
            if (!userId) return res.status(401).json({ error: "Authentication required" });

            const invites = await InviteService.listInvites(roomId, userId);
            return res.json(invites);
        } catch (error: any) {
            if (error.message.includes("not found") || error.message.includes("Only the host")) {
                return res.status(403).json({ error: error.message });
            }
            logger.error({ err: error }, "List Invites Error");
            return res.status(500).json({ error: "Failed to list invites" });
        }
    }

    // ── Room Recommendations ────────────────────────────────────────

    static async recommended(req: Request, res: Response) {
        try {
            const userId = (req as any).user?.id;
            if (!userId) return res.status(401).json({ error: "Authentication required" });

            const limit = parseInt(req.query.limit as string) || 20;
            const offset = parseInt(req.query.offset as string) || 0;

            const rooms = await RecommendationService.getRecommended(userId, limit, offset);
            return res.json(rooms);
        } catch (error) {
            logger.error({ err: error }, "Recommended Rooms Error");
            return res.status(500).json({ error: "Failed to get recommendations" });
        }
    }

    // ── Room Clips ──────────────────────────────────────────────────

    static async createClip(req: Request, res: Response) {
        try {
            const roomId = req.params.id as string;
            const userId = (req as any).user?.id;
            if (!userId) return res.status(401).json({ error: "Authentication required" });

            const { startTime, endTime, title } = req.body;

            const clip = await ClipService.createClip(userId, roomId, startTime, endTime, title);
            return res.status(201).json(clip);
        } catch (error: any) {
            if (error.message.includes("not found") || error.message.includes("must be")) {
                return res.status(400).json({ error: error.message });
            }
            logger.error({ err: error }, "Create Clip Error");
            return res.status(500).json({ error: "Failed to create clip" });
        }
    }

    static async listClips(req: Request, res: Response) {
        try {
            const roomId = req.params.id as string;
            const limit = parseInt(req.query.limit as string) || 20;
            const offset = parseInt(req.query.offset as string) || 0;

            const result = await ClipService.listClips(roomId, limit, offset);
            return res.json(result);
        } catch (error) {
            logger.error({ err: error }, "List Clips Error");
            return res.status(500).json({ error: "Failed to list clips" });
        }
    }

    static async getClip(req: Request, res: Response) {
        try {
            const clipId = req.params.id as string;
            const clip = await ClipService.getClip(clipId);
            if (!clip) return res.status(404).json({ error: "Clip not found" });
            return res.json(clip);
        } catch (error) {
            logger.error({ err: error }, "Get Clip Error");
            return res.status(500).json({ error: "Failed to get clip" });
        }
    }
}
