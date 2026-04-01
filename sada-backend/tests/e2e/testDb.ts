import 'reflect-metadata';
import { DataSource, ColumnType } from 'typeorm';
import { User } from '../../src/models/User';
import { Room } from '../../src/models/Room';
import { RoomParticipant } from '../../src/models/RoomParticipant';
import { Follow } from '../../src/models/Follow';
import { GemTransaction } from '../../src/models/GemTransaction';
import { Category } from '../../src/models/Category';
import { SpeakerRequest } from '../../src/models/SpeakerRequest';
import { Report } from '../../src/models/Report';
import { UserBlock } from '../../src/models/UserBlock';
import { AdminAction } from '../../src/models/AdminAction';
import { Notification } from '../../src/models/Notification';
import { Withdrawal } from '../../src/models/Withdrawal';
import { RoomRecording } from '../../src/models/RoomRecording';
import { ChatReaction } from '../../src/models/ChatReaction';
import { UserActivity } from '../../src/models/UserActivity';
import { NotificationPreference } from '../../src/models/NotificationPreference';
import { RoomInvite } from '../../src/models/RoomInvite';
import { RoomClip } from '../../src/models/RoomClip';
import { UserPresence } from '../../src/models/UserPresence';
import { Conversation } from '../../src/models/Conversation';
import { ConversationParticipant } from '../../src/models/ConversationParticipant';
import { Message } from '../../src/models/Message';
import { RoomBookmark } from '../../src/models/RoomBookmark';

// Patch SqliteDriver to accept PostgreSQL-compatible types (uuid, enum, jsonb, timestamp, etc.)
// SQLite stores these as text anyway, so they work at the data level — TypeORM just needs
// the validation to pass. We intercept the instance's supportedDataTypes via a prototype getter.
const SqliteDriver = require('typeorm/driver/sqlite/SqliteDriver').SqliteDriver;

const allSupportedTypes: string[] = [
  'int', 'integer', 'tinyint', 'smallint', 'mediumint', 'bigint',
  'unsigned big int', 'int2', 'int8',
  'character', 'varchar', 'varying character', 'nchar', 'native character',
  'nvarchar', 'text', 'clob',
  'blob',
  'real', 'double', 'double precision', 'float',
  'numeric', 'number', 'decimal', 'boolean', 'date', 'datetime',
  'simple-json', 'simple-enum',
  // PostgreSQL-compatible additions — SQLite handles all as text
  'uuid', 'enum', 'jsonb', 'timestamp', 'json',
  // Inferred from TS union types (Date | null, string | null, etc.)
  'Object',
];

// Override via prototype so every new instance gets the extended list
Object.defineProperty(SqliteDriver.prototype, 'supportedDataTypes', {
  get() { return allSupportedTypes; },
  set() { /* noop — prevent instance field from shadowing */ },
  configurable: true,
});

// Patch SqliteQueryRunner.query to translate PostgreSQL ILIKE → SQLite LIKE
const SqliteQueryRunner = require('typeorm/driver/sqlite/SqliteQueryRunner').SqliteQueryRunner;
const origQuery = SqliteQueryRunner.prototype.query;
SqliteQueryRunner.prototype.query = function (query: string, parameters?: any[], useStructuredResult?: boolean) {
  return origQuery.call(this, query.replace(/\bILIKE\b/g, 'LIKE'), parameters, useStructuredResult);
};

export const AppDataSource = new DataSource({
  type: 'sqlite',
  database: ':memory:',
  synchronize: true,
  entities: [
    User, Room, RoomParticipant, Follow, GemTransaction, Category,
    SpeakerRequest, Report, UserBlock, AdminAction, Notification,
    Withdrawal, RoomRecording, ChatReaction, UserActivity,
    NotificationPreference, RoomInvite, RoomClip, UserPresence,
    Conversation, ConversationParticipant, Message, RoomBookmark,
  ],
  logging: false,
});
