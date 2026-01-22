import { Request, Response } from "express";
import { RoomService } from "../services/room.service";
import { AuthService } from "../services/auth.service"; // Assume we might need to verify user or get from request

export class RoomController {
    static async create(req: Request, res: Response) {
        try {
            // In a real app, user is attached to req by middleware
            // For MVP, we pass userId in body or header if not using full middleware yet
            // Let's assume we pass { userId, title, category, description } in body for now
            const { userId, title, category, description } = req.body;

            // TODO: Replace with req.user from middleware
            const user = await AuthService.mapUser(userId, undefined, undefined); // This is hacky, assumes userId is appleId. 
            // Better: Fetch user by DB ID
            // Let's assume for this step we have a proper middleware or we fetch user by ID
            // Fix: We need a way to get the User entity.
            // Let's assume the auth middleware puts { id } in req.headers['user-id'] for this phase? 
            // Or just fetch by ID.

            // Re-fetching user for safety
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

    static async join(req: Request, res: Response) {
        try {
            const id = req.params.id as string;
            const { userId } = req.body;

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
            const { userId } = req.body;
            await RoomService.leaveRoom(userId, id);
            return res.json({ success: true });
        } catch (error) {
            return res.status(500).json({ error: "Failed to leave room" });
        }
    }

    static async manageSpeaker(req: Request, res: Response) {
        try {
            const id = req.params.id as string;
            const { userId, targetUserId, role } = req.body; // userId is the requester (Host)

            if (!targetUserId || !role) {
                return res.status(400).json({ error: "Missing targetUserId or role" });
            }

            const updatedParticipant = await RoomService.updateParticipantRole(userId, id, targetUserId, role);
            return res.json(updatedParticipant);
        } catch (error: any) {
            return res.status(400).json({ error: error.message });
        }
    }

    static async end(req: Request, res: Response) {
        try {
            const id = req.params.id as string;
            const { userId } = req.body; // Host ID
            await RoomService.endRoom(userId, id);
            return res.json({ success: true });
        } catch (error: any) {
            return res.status(400).json({ error: error.message });
        }
    }
}
