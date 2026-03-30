import jwt from "jsonwebtoken";
import appleSignin from "apple-signin-auth";
import { User } from "../models/User";
import { AppDataSource } from "../config/database";
import { vars } from "../config/env";
import { getJwtSecret } from "../middleware/auth";

const userRepository = AppDataSource.getRepository(User);

export class AuthService {
    static async verifyAppleToken(identityToken: string) {
        try {
            // Verify identity token with Apple
            // In a real scenario, you'd also check the audience (clientID)
            // const { sub: appleId, email } = await appleSignin.verifyIdToken(identityToken, {
            //     audience: process.env.APPLE_CLIENT_ID,
            //     ignoreExpiration: true, // simplified for dev/MVP if needed
            // });

            // For MVP development speed/mocking without a real frontend sending tokens:
            // We can assume the token is the appleId if it's not a real JWT in dev mode, 
            // OR use the library if we have real tokens.
            // Let's assume we might receive a mock token in early dev.

            // FIXME: Replace with actual verification for prod
            const appleId = identityToken; // Placeholder until real token is available
            const email = "user@example.com"; // Placeholder

            // Real implementation would be:
            // const payload = await appleSignin.verifyIdToken(identityToken, { audience: ... });
            // return payload;

            return { appleId, email };
        } catch (err) {
            console.error("Apple Sign-In Error", err);
            throw new Error("Invalid Apple Identity Token");
        }
    }

    static async mapUser(appleId: string, email: string | undefined, fullName: string | undefined) {
        let user = await userRepository.findOneBy({ apple_id: appleId });

        if (user && user.banned) {
            throw new Error("User is banned");
        }

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
            getJwtSecret(),
            { expiresIn: "7d" }
        );
    }

    static async signInWithApple(identityToken: string, fullName?: string) {
        // 1. Verify Token
        // const { sub, email } = await this.verifyAppleToken(identityToken); 
        // Using simplified mock for initial dev cycle as we don't have real iOS tokens yet
        const sub = identityToken;
        const email = "mock@test.com";

        // 2. Find or Create User
        const user = await this.mapUser(sub, email, fullName);

        // 3. Generate Session Token
        const token = this.generateToken(user);

        return { user, token };
    }
}
