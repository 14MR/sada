import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { User } from "../models/User";
import { AppDataSource } from "../config/database";

const userRepository = AppDataSource.getRepository(User);

export interface AuthRequest extends Request {
    user?: User;
}

export const authMiddleware = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        const authHeader = req.headers.authorization;

        if (!authHeader || !authHeader.startsWith("Bearer ")) {
            return res.status(401).json({ error: "No token provided" });
        }

        const token = authHeader.substring(7);

        const decoded = jwt.verify(token, process.env.JWT_SECRET!) as { id: string; username: string };

        const user = await userRepository.findOneBy({ id: decoded.id });

        if (!user) {
            return res.status(401).json({ error: "User not found" });
        }

        req.user = user;
        next();
    } catch (error) {
        return res.status(401).json({ error: "Invalid or expired token" });
    }
};
