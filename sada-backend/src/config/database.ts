import { DataSource } from "typeorm";
import { vars } from "./env";
import { User } from "../models/User";
import { Room } from "../models/Room";
import { RoomParticipant } from "../models/RoomParticipant";
import { Follow } from "../models/Follow";
import { GemTransaction } from "../models/GemTransaction";

const isProduction = process.env.NODE_ENV === 'production';

export const AppDataSource = new DataSource({
    type: "postgres",
    host: vars.db.host,
    port: vars.db.port,
    username: vars.db.username,
    password: vars.db.password,
    database: vars.db.database,
    synchronize: !isProduction,
    logging: !isProduction,
    entities: [User, Room, RoomParticipant, Follow, GemTransaction],
    subscribers: [],
    migrations: ["src/migrations/**/*.ts"],
});
