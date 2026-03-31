import dotenv from "dotenv";

dotenv.config();

export const vars = {
    port: process.env.PORT ? parseInt(process.env.PORT) : 3000,
    db: {
        host: process.env.DB_HOST || "localhost",
        port: process.env.DB_PORT ? parseInt(process.env.DB_PORT) : 5432,
        username: process.env.DB_USERNAME || "postgres",
        password: process.env.DB_PASSWORD || "postgres",
        database: process.env.DB_NAME || "sada",
    },
    cloudflare: {
        turnKeyId: process.env.CLOUDFLARE_TURN_KEY_ID,
        apiToken: process.env.CLOUDFLARE_API_TOKEN
    }
};

const requiredEnvVars = ['CLOUDFLARE_TURN_KEY_ID', 'CLOUDFLARE_API_TOKEN', 'JWT_SECRET'];
const missingVars = requiredEnvVars.filter(varName => !process.env[varName]);

if (missingVars.length > 0 && process.env.NODE_ENV === 'production') {
    throw new Error(`Missing required environment variables: ${missingVars.join(', ')}`);
}
