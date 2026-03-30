import jwt from "jsonwebtoken";
import appleSignin from "apple-signin-auth";
import { User } from "../models/User";
import { AppDataSource } from "../config/database";
import { getJwtSecret } from "../middleware/auth";

const userRepository = AppDataSource.getRepository(User);

export class AuthService {
    static async verifyAppleToken(identityToken: string): Promise<{ appleId: string; email: string | undefined }> {
        // Mock fallback for test environment
        if (process.env.NODE_ENV === "test") {
            return { appleId: identityToken, email: undefined };
        }

        try {
            const payload = await appleSignin.verifyIdToken(identityToken, {
                audience: process.env.APPLE_CLIENT_ID,
                ignoreExpiration: false,
            });

            return {
                appleId: payload.sub,
                email: payload.email ?? undefined,
            };
        } catch (err) {
            console.error("Apple Sign-In verification failed", err);
            throw new Error("Invalid Apple Identity Token");
        }
    }

    static async mapUser(appleId: string, email: string | undefined, fullName: string | undefined) {
        let user = await userRepository.findOneBy({ apple_id: appleId });

        if (user && user.banned) {
            throw new Error("User is banned");
        }

        if (!user) {
            user = new User();
            user.apple_id = appleId;
            user.username = `user_${Date.now()}`;
            user.display_name = fullName || "New User";

            await userRepository.save(user);
        }

        return user;
    }

    static generateToken(user: User) {
        return jwt.sign(
            { id: user.id, username: user.username },
            getJwtSecret(),
            { expiresIn: "7d" }
        );
    }

    static async signInWithApple(identityToken: string, fullName?: string) {
        // 1. Verify Token (uses real Apple verification in prod, mock in test)
        const { appleId, email } = await this.verifyAppleToken(identityToken);

        // 2. Find or Create User
        const user = await this.mapUser(appleId, email, fullName);

        // 3. Generate Session Token
        const token = this.generateToken(user);

        return { user, token };
    }
}
