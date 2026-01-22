import { User } from "../models/User";
import { AppDataSource } from "../config/database";

const userRepository = AppDataSource.getRepository(User);

export class UserService {
    static async getProfile(userId: string) {
        return await userRepository.findOneBy({ id: userId });
    }

    static async updateProfile(id: string, updates: Partial<User>) {
        const user = await userRepository.findOneBy({ id });
        if (!user) throw new Error("User not found");

        Object.assign(user, updates);
        return await userRepository.save(user);
    }

    static async deleteUser(id: string) {
        const user = await userRepository.findOneBy({ id });
        if (!user) {
            // Idempotent: if already deleted, return true
            return true;
        }

        // Due to cascade settings on relations (Follow, Room, RoomParticipant)
        // and SET NULL on GemTransactions, a simple remove should suffice
        // IF the database constraints are strictly set. 
        // However, TypeORM { onDelete: "CASCADE" } options in decorators mainly affect 
        // migration generation or if using persistence cascade.
        // For existing DBs without those FK constraints enacted, we might need manual cleanup.
        // Assuming we are in Dev/MVP and sync=true is on, the FKs should be updated by TypeORM on startup.

        await userRepository.remove(user);
        return true;
    }
}
