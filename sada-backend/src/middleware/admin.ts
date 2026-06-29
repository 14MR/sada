import { Request, Response, NextFunction } from "express";
import { timingSafeEqual } from "crypto";

export function isValidAdminKey(candidate: unknown, expected?: string): boolean {
    const expectedKey = arguments.length > 1 ? expected : process.env.ADMIN_KEY;
    if (typeof candidate !== "string" || !expectedKey) return false;

    const candidateBuffer = Buffer.from(candidate);
    const expectedBuffer = Buffer.from(expectedKey);
    return candidateBuffer.length === expectedBuffer.length &&
        timingSafeEqual(candidateBuffer, expectedBuffer);
}

export function adminAuth(req: Request, res: Response, next: NextFunction) {
    const adminKey = req.headers["x-admin-key"] as string;

    if (!isValidAdminKey(adminKey)) {
        return res.status(403).json({ error: "Forbidden: invalid admin key" });
    }

    next();
}
