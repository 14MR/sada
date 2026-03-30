import { ZodObject, ZodError } from "zod";
import { Request, Response, NextFunction } from "express";
import logger from "../config/logger";

export const validate = (schema: ZodObject, source: "body" | "query" | "params" = "body") => {
    return (req: Request, res: Response, next: NextFunction) => {
        try {
            schema.parse(req[source]);
            next();
        } catch (error) {
            if (error instanceof ZodError) {
                return res.status(400).json({ error: error.issues[0].message });
            }
            logger.error({ err: error }, "Validation error");
            return res.status(500).json({ error: "Internal server error" });
        }
    };
};
