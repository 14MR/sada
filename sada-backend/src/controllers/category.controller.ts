import { Request, Response } from "express";
import { CategoryService } from "../services/category.service";

export class CategoryController {
    static async list(_req: Request, res: Response) {
        try {
            const categories = await CategoryService.getAll();
            return res.json(categories);
        } catch (error) {
            console.error("List Categories Error:", error);
            return res.status(500).json({ error: "Failed to list categories" });
        }
    }

    static async getRooms(req: Request, res: Response) {
        try {
            const slug = req.params.slug as string;
            const rooms = await CategoryService.getRoomsByCategorySlug(slug);
            return res.json(rooms);
        } catch (error: any) {
            if (error.message === "Category not found") {
                return res.status(404).json({ error: error.message });
            }
            console.error("Get Category Rooms Error:", error);
            return res.status(500).json({ error: "Failed to get rooms" });
        }
    }
}
