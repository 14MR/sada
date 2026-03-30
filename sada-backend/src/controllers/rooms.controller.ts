import { Request, Response } from "express";
import { RoomService } from "../services/room.service";
import { AuthenticatedRequest } from "../middleware/auth";

export class RoomController {
    static async create(req: AuthenticatedRequest, res: Response) {
        try {
            const { title, category, description } = req.body;
            const userId = req.user!.id;

            const { UserService } = require("../services/user.service");
            const host = await UserService.getProfile(userId);

            if (!host) return res.status(404).json({ error: "Host not found" });

            const room = await RoomService.createRoom(host, title, category, description);
            return res.status(201).json(room);
        } catch (error) {
            console.error("Create Room Error:", error);
            return res.status(500).json({ error: "Failed to create room" });
        }
    }

    static async list(req: Request, res: Response) {
        try {
            const category = req.query.category as string;
            const rooms = await RoomService.getLiveRooms(category);
            return res.json(rooms);
        } catch (error) {
            console.error("List Rooms Error:", error);
            return res.status(500).json({ error: "Failed to list rooms" });
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

    static async join(req: AuthenticatedRequest, res: Response) {
        try {
            const id = req.params.id as string;
            const userId = req.user!.id;

            const { UserService } = require("../services/user.service");
            const user = await UserService.getProfile(userId);
            if (!user) return res.status(404).json({ error: "User not found" });

            const result = await RoomService.joinRoom(user, id);
            return res.json(result);
        } catch (error: any) {
            return res.status(400).json({ error: error.message });
        }
    }

    static async leave(req: AuthenticatedRequest, res: Response) {
        try {
            const id = req.params.id as string;
            const userId = req.user!.id;
            await RoomService.leaveRoom(userId, id);
            return res.json({ success: true });
        } catch (error) {
            return res.status(500).json({ error: "Failed to leave room" });
        }
    }

    static async manageSpeaker(req: AuthenticatedRequest, res: Response) {
        try {
            const id = req.params.id as string;
            const { targetUserId, role } = req.body;
            const userId = req.user!.id;

            if (!targetUserId || !role) {
                return res.status(400).json({ error: "Missing targetUserId or role" });
            }

            const updatedParticipant = await RoomService.updateParticipantRole(userId, id, targetUserId, role);
            return res.json(updatedParticipant);
        } catch (error: any) {
            return res.status(400).json({ error: error.message });
        }
    }

    static async end(req: AuthenticatedRequest, res: Response) {
        try {
            const id = req.params.id as string;
            const userId = req.user!.id;
            await RoomService.endRoom(userId, id);
            return res.json({ success: true });
        } catch (error: any) {
            return res.status(400).json({ error: error.message });
        }
    }
}
