import { DataSource } from "typeorm";
import { vars } from "./env";
import { User } from "../models/User";
import { Room } from "../models/Room";
import { RoomParticipant } from "../models/RoomParticipant";
import { Follow } from "../models/Follow";
import { GemTransaction } from "../models/GemTransaction";

export const AppDataSource = new DataSource({
    type: "postgres",
    host: vars.db.host,
    port: vars.db.port,
    username: vars.db.username,
    password: vars.db.password,
    database: vars.db.database,
    synchronize: false,
    logging: process.env.DB_LOGGING === 'true',
    entities: [User, Room, RoomParticipant, Follow, GemTransaction],
    subscribers: [],
    migrations: [],
});

console.warn(
    "WARNING: TypeORM synchronize is disabled. Run migrations manually to apply schema changes."
);
