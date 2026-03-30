import { AppDataSource } from "../config/database";
import { Category } from "../models/Category";
import { Room } from "../models/Room";

const categoryRepository = AppDataSource.getRepository(Category);
const roomRepository = AppDataSource.getRepository(Room);

export class CategoryService {
    static async getAll() {
        return await categoryRepository.find({ order: { name: "ASC" } });
    }

    static async getBySlug(slug: string) {
        return await categoryRepository.findOne({ where: { slug } });
    }

    static async getRoomsByCategorySlug(slug: string) {
        const category = await this.getBySlug(slug);
        if (!category) throw new Error("Category not found");

        return await roomRepository.find({
            where: { categoryId: category.id, status: "live" },
            relations: ["host"],
            order: { started_at: "DESC" },
        });
    }
}
