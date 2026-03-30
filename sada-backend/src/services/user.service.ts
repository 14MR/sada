import { instanceToPlain } from "class-transformer";
import { User } from "../models/User";
import { AppDataSource } from "../config/database";

const userRepository = AppDataSource.getRepository(User);

const ALLOWED_UPDATE_FIELDS = new Set(["username", "display_name", "bio", "avatar_url", "language"]);

export class UserService {
    static async getProfile(userId: string) {
        const user = await userRepository.findOneBy({ id: userId });
        if (!user) return null;
        return instanceToPlain(user);
    }

    static async updateProfile(id: string, updates: Record<string, any>) {
        const user = await userRepository.findOneBy({ id });
        if (!user) throw new Error("User not found");

        for (const key of Object.keys(updates)) {
            if (ALLOWED_UPDATE_FIELDS.has(key)) {
                (user as any)[key] = updates[key];
            }
        }

        const saved = await userRepository.save(user);
        return instanceToPlain(saved);
    }

    static async deleteUser(id: string) {
        const user = await userRepository.findOneBy({ id });
        if (!user) return true;
        await userRepository.remove(user);
        return true;
    }
}
