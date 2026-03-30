import { Request, Response } from "express";
import { AuthService } from "../services/auth.service";
import logger from "../config/logger";

export class AuthController {
    static async signIn(req: Request, res: Response) {
        try {
            const { identityToken, fullName } = req.body;

            if (!identityToken) {
                return res.status(400).json({ error: "identityToken is required" });
            }

            const result = await AuthService.signInWithApple(identityToken, fullName);
            return res.json(result);
        } catch (error: any) {
            if (error.message === "User is banned") {
                return res.status(403).json({ error: "Account is banned" });
            }
            logger.error({ err: error }, "Signin Error");
            return res.status(500).json({ error: "Authentication failed" });
        }
    }
}
