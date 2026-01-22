import { Request, Response } from "express";
import { AuthService } from "../services/auth.service";

export class AuthController {
    static async signIn(req: Request, res: Response) {
        try {
            const { identityToken, fullName } = req.body;

            if (!identityToken) {
                return res.status(400).json({ error: "identityToken is required" });
            }

            const result = await AuthService.signInWithApple(identityToken, fullName);
            return res.json(result);
        } catch (error) {
            console.error("Signin Error:", error);
            return res.status(500).json({ error: "Authentication failed" });
        }
    }
}
