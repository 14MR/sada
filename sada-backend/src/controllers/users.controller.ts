import { Request, Response } from "express";
import { UserService } from "../services/user.service";

export class UserController {
    static async getProfile(req: Request, res: Response) {
        try {
            const id = req.params.id as string;
            const user = await UserService.getProfile(id);
            if (!user) {
                return res.status(404).json({ error: "User not found" });
            }
            return res.json(user);
        } catch (error) {
            console.error("Get Profile Error:", error);
            return res.status(500).json({ error: "Failed to fetch profile" });
        }
    }

    static async updateProfile(req: Request, res: Response) {
        try {
            const id = req.params.id as string;
            const updates = req.body;

            // In a real app, ensure the requester is the user itself or admin
            // e.g. if (req.user.id !== id) return res.status(403)

            const updatedUser = await UserService.updateProfile(id, updates);
            return res.status(200).json(updatedUser);
        } catch (error: any) {
            return res.status(400).json({ error: error.message });
        }
    }

    static async deleteAccount(req: Request, res: Response) {
        try {
            const id = req.params.id as string;
            // TODO: Auth Check - Ensure only the user can delete themselves
            await UserService.deleteUser(id);
            return res.status(200).json({ success: true, message: "Account deleted successfully" });
        } catch (error: any) {
            return res.status(500).json({ error: error.message });
        }
    }
}
