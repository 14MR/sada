import jwt from "jsonwebtoken";
import appleSignin from "apple-signin-auth";
import { User } from "../models/User";
import { AppDataSource } from "../config/database";
import { getJwtSecret } from "../middleware/auth";
import logger from "../config/logger";

const userRepository = AppDataSource.getRepository(User);

export function isUniqueConstraintError(error: unknown): boolean {
    if (!error || typeof error !== "object") return false;

    const err = error as { code?: unknown; errno?: unknown; message?: unknown };
    const code = typeof err.code === "string" ? err.code : undefined;
    const errno = typeof err.errno === "number" ? err.errno : undefined;
    const message = typeof err.message === "string" ? err.message : "";

    return code === "23505" ||
        code === "SQLITE_CONSTRAINT" ||
        code === "ER_DUP_ENTRY" ||
        errno === 1062 ||
        /duplicate|unique|constraint/i.test(message);
}

export class BannedUserError extends Error {
    constructor() {
        super("User is banned");
        this.name = "BannedUserError";
    }
}

export class AuthService {
    static async verifyAppleToken(identityToken: string): Promise<{ appleId: string; email: string | undefined }> {
        // Mock fallback: skip real verification when APPLE_BUNDLE_ID is not configured (dev/test)
        if (!process.env.APPLE_BUNDLE_ID) {
            return { appleId: identityToken, email: undefined };
        }

        try {
            const payload = await appleSignin.verifyIdToken(identityToken, {
                audience: process.env.APPLE_BUNDLE_ID,
                ignoreExpiration: false,
            });

            return {
                appleId: payload.sub,
                email: payload.email ?? undefined,
            };
        } catch (err) {
            logger.error({ err }, "Apple Sign-In verification failed");
            throw new Error("Invalid Apple Identity Token");
        }
    }

    static async mapUser(appleId: string, email: string | undefined, fullName: string | undefined) {
        let user = await userRepository.findOneBy({ apple_id: appleId });

        if (user && user.banned) {
            throw new BannedUserError();
        }

        if (user) {
            return user;
        }

        user = new User();
        user.apple_id = appleId;
        user.username = `user_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
        user.display_name = fullName || "New User";

        try {
            await userRepository.save(user);
        } catch (error) {
            if (!isUniqueConstraintError(error)) throw error;

            const existingUser = await userRepository.findOneBy({ apple_id: appleId });
            if (!existingUser) throw error;
            if (existingUser.banned) throw new BannedUserError();

            return existingUser;
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
