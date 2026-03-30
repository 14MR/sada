import { Response } from "express";
import { UserService } from "../services/user.service";
import { AuthenticatedRequest } from "../middleware/auth";

export class UserController {
    static async getProfile(req: AuthenticatedRequest, res: Response) {
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

    static async updateProfile(req: AuthenticatedRequest, res: Response) {
        try {
            const id = req.params.id as string;

            if (req.user!.id !== id) {
                return res.status(403).json({ error: "Cannot update another user's profile" });
            }

            const updates = req.body;
            const updatedUser = await UserService.updateProfile(id, updates);
            return res.status(200).json(updatedUser);
        } catch (error: any) {
            return res.status(400).json({ error: error.message });
        }
    }

    static async deleteAccount(req: AuthenticatedRequest, res: Response) {
        try {
            const id = req.params.id as string;

            if (req.user!.id !== id) {
                return res.status(403).json({ error: "Cannot delete another user's account" });
            }

            await UserService.deleteUser(id);
            return res.status(200).json({ success: true, message: "Account deleted successfully" });
        } catch (error: any) {
            return res.status(500).json({ error: error.message });
        }
    }
}
