export {};

declare global {
    namespace Express {
        interface UserPayload {
            id: string;
            username: string;
        }

        interface Request {
            user?: UserPayload;
        }
    }
}
