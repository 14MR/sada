import jwt from "jsonwebtoken";
import appleSignin from "apple-signin-auth";
import { User } from "../models/User";
import { AppDataSource } from "../config/database";
import { vars } from "../config/env";

const userRepository = AppDataSource.getRepository(User);

export class AuthService {
    static async verifyAppleToken(identityToken: string) {
        try {
            // In development, skip Apple verification for testing
            if (process.env.NODE_ENV !== 'production') {
                console.log("[DEV MODE] Skipping Apple token verification");
                return { appleId: identityToken, email: `dev-${Date.now()}@example.com` };
            }

            const { sub: appleId, email } = await appleSignin.verifyIdToken(identityToken, {
                audience: process.env.APPLE_CLIENT_ID,
                ignoreExpiration: true,
            });

            return { appleId, email };
        } catch (err) {
            console.error("Apple Sign-In Error", err);
            throw new Error("Invalid Apple Identity Token");
        }
    }

    static async mapUser(appleId: string, email: string | undefined, fullName: string | undefined) {
        let user = await userRepository.findOneBy({ apple_id: appleId });

        if (!user) {
            // Create new user
            user = new User();
            user.apple_id = appleId;
            // Generate a random username initially
            user.username = `user_${Date.now()}`;
            user.display_name = fullName || "New User";

            await userRepository.save(user);
        }

        return user;
    }

    static generateToken(user: User) {
        return jwt.sign(
            { id: user.id, username: user.username },
            process.env.JWT_SECRET!,
            { expiresIn: "7d" }
        );
    }

    static async signInWithApple(identityToken: string, fullName?: string) {
        const { appleId, email } = await this.verifyAppleToken(identityToken);

        const user = await this.mapUser(appleId, email, fullName);

        const token = this.generateToken(user);

        return { user, token };
    }
}
