import { validate } from "class-validator";
import { plainToInstance } from "class-transformer";
import { Request, Response, NextFunction } from "express";

export function validateBody(dtoClass: new () => any) {
    return async (req: Request, res: Response, next: NextFunction) => {
        const dto = plainToInstance(dtoClass, req.body);
        const errors = await validate(dto, { whitelist: true, forbidNonWhitelisted: true });

        if (errors.length > 0) {
            const messages = errors.map(e => Object.values(e.constraints || {}).join(", "));
            return res.status(400).json({ error: messages.join("; ") });
        }

        req.body = dto;
        next();
    };
}
