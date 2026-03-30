import { DataSource } from "typeorm";
import { vars } from "./env";
import { User } from "../models/User";
import { Room } from "../models/Room";
import { RoomParticipant } from "../models/RoomParticipant";
import { Follow } from "../models/Follow";
import { GemTransaction } from "../models/GemTransaction";
import { Category } from "../models/Category";
import { SpeakerRequest } from "../models/SpeakerRequest";
import { Report } from "../models/Report";
import { UserBlock } from "../models/UserBlock";

export const AppDataSource = new DataSource({
    type: "postgres",
    host: vars.db.host,
    port: vars.db.port,
    username: vars.db.username,
    password: vars.db.password,
    database: vars.db.database,
    synchronize: true,
    logging: false,
    entities: [User, Room, RoomParticipant, Follow, GemTransaction, Category, SpeakerRequest, Report, UserBlock],
    subscribers: [],
    migrations: [],
});
