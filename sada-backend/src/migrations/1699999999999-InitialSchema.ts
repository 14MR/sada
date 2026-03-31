import { MigrationInterface, QueryRunner, Table, TableForeignKey, TableIndex } from "typeorm";

export class InitialSchema1699999999999 implements MigrationInterface {
    name = 'InitialSchema1699999999999';

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.createTable(
            new Table({
                name: "users",
                columns: [
                    {
                        name: "id",
                        type: "uuid",
                        isPrimary: true,
                        generationStrategy: "uuid",
                        default: "uuid_generate_v4()"
                    },
                    {
                        name: "apple_id",
                        type: "varchar",
                        isUnique: true
                    },
                    {
                        name: "username",
                        type: "varchar",
                        length: "50",
                        isUnique: true
                    },
                    {
                        name: "display_name",
                        type: "varchar",
                        length: "100",
                        isNullable: true
                    },
                    {
                        name: "bio",
                        type: "text",
                        isNullable: true
                    },
                    {
                        name: "avatar_url",
                        type: "varchar",
                        isNullable: true
                    },
                    {
                        name: "verified",
                        type: "boolean",
                        default: false
                    },
                    {
                        name: "language",
                        type: "varchar",
                        default: "'en'"
                    },
                    {
                        name: "gem_balance",
                        type: "integer",
                        default: 0
                    },
                    {
                        name: "created_at",
                        type: "timestamp",
                        default: "now()"
                    },
                    {
                        name: "updated_at",
                        type: "timestamp",
                        default: "now()"
                    }
                ],
                indices: [
                    new TableIndex({
                        name: "IDX_users_username",
                        columnNames: ["username"],
                        isUnique: true
                    })
                ]
            }),
            true
        );

        await queryRunner.createTable(
            new Table({
                name: "rooms",
                columns: [
                    {
                        name: "id",
                        type: "uuid",
                        isPrimary: true,
                        generationStrategy: "uuid",
                        default: "uuid_generate_v4()"
                    },
                    {
                        name: "host_id",
                        type: "uuid"
                    },
                    {
                        name: "title",
                        type: "varchar",
                        length: "100"
                    },
                    {
                        name: "description",
                        type: "text",
                        isNullable: true
                    },
                    {
                        name: "category",
                        type: "varchar",
                        length: "50",
                        isNullable: true
                    },
                    {
                        name: "status",
                        type: "varchar",
                        length: "20",
                        default: "'live'"
                    },
                    {
                        name: "listener_count",
                        type: "integer",
                        default: 0
                    },
                    {
                        name: "started_at",
                        type: "timestamp",
                        default: "now()"
                    },
                    {
                        name: "ended_at",
                        type: "timestamp",
                        isNullable: true
                    },
                    {
                        name: "allow_speakers",
                        type: "boolean",
                        default: true
                    },
                    {
                        name: "chat_enabled",
                        type: "boolean",
                        default: true
                    }
                ],
                indices: [
                    new TableIndex({
                        name: "IDX_rooms_title",
                        columnNames: ["title"]
                    }),
                    new TableIndex({
                        name: "IDX_rooms_category",
                        columnNames: ["category"]
                    }),
                    new TableIndex({
                        name: "IDX_rooms_status",
                        columnNames: ["status"]
                    })
                ]
            }),
            true
        );

        await queryRunner.createForeignKey(
            "rooms",
            new TableForeignKey({
                columnNames: ["host_id"],
                referencedColumnNames: ["id"],
                referencedTableName: "users",
                onDelete: "CASCADE"
            })
        );

        await queryRunner.createTable(
            new Table({
                name: "room_participants",
                columns: [
                    {
                        name: "id",
                        type: "uuid",
                        isPrimary: true,
                        generationStrategy: "uuid",
                        default: "uuid_generate_v4()"
                    },
                    {
                        name: "room_id",
                        type: "uuid"
                    },
                    {
                        name: "user_id",
                        type: "uuid"
                    },
                    {
                        name: "role",
                        type: "varchar",
                        length: "20",
                        default: "'listener'"
                    },
                    {
                        name: "joined_at",
                        type: "timestamp",
                        default: "now()"
                    },
                    {
                        name: "left_at",
                        type: "timestamp",
                        isNullable: true
                    }
                ]
            }),
            true
        );

        await queryRunner.createForeignKey(
            "room_participants",
            new TableForeignKey({
                columnNames: ["room_id"],
                referencedColumnNames: ["id"],
                referencedTableName: "rooms",
                onDelete: "CASCADE"
            })
        );

        await queryRunner.createForeignKey(
            "room_participants",
            new TableForeignKey({
                columnNames: ["user_id"],
                referencedColumnNames: ["id"],
                referencedTableName: "users",
                onDelete: "CASCADE"
            })
        );

        await queryRunner.createTable(
            new Table({
                name: "follows",
                columns: [
                    {
                        name: "id",
                        type: "uuid",
                        isPrimary: true,
                        generationStrategy: "uuid",
                        default: "uuid_generate_v4()"
                    },
                    {
                        name: "follower_id",
                        type: "uuid"
                    },
                    {
                        name: "following_id",
                        type: "uuid"
                    },
                    {
                        name: "created_at",
                        type: "timestamp",
                        default: "now()"
                    }
                ],
                uniques: [
                    {
                        name: "UQ_follows_follower_following",
                        columnNames: ["follower_id", "following_id"]
                    }
                ]
            }),
            true
        );

        await queryRunner.createForeignKey(
            "follows",
            new TableForeignKey({
                columnNames: ["follower_id"],
                referencedColumnNames: ["id"],
                referencedTableName: "users",
                onDelete: "CASCADE"
            })
        );

        await queryRunner.createForeignKey(
            "follows",
            new TableForeignKey({
                columnNames: ["following_id"],
                referencedColumnNames: ["id"],
                referencedTableName: "users",
                onDelete: "CASCADE"
            })
        );

        await queryRunner.createTable(
            new Table({
                name: "gem_transactions",
                columns: [
                    {
                        name: "id",
                        type: "uuid",
                        isPrimary: true,
                        generationStrategy: "uuid",
                        default: "uuid_generate_v4()"
                    },
                    {
                        name: "sender_id",
                        type: "uuid",
                        isNullable: true
                    },
                    {
                        name: "receiver_id",
                        type: "uuid",
                        isNullable: true
                    },
                    {
                        name: "amount",
                        type: "integer"
                    },
                    {
                        name: "type",
                        type: "enum",
                        enum: ["purchase", "gift", "bonus"],
                        default: "'purchase'"
                    },
                    {
                        name: "reference_id",
                        type: "varchar",
                        isNullable: true
                    },
                    {
                        name: "created_at",
                        type: "timestamp",
                        default: "now()"
                    }
                ]
            }),
            true
        );

        await queryRunner.createForeignKey(
            "gem_transactions",
            new TableForeignKey({
                columnNames: ["sender_id"],
                referencedColumnNames: ["id"],
                referencedTableName: "users",
                onDelete: "SET NULL"
            })
        );

        await queryRunner.createForeignKey(
            "gem_transactions",
            new TableForeignKey({
                columnNames: ["receiver_id"],
                referencedColumnNames: ["id"],
                referencedTableName: "users",
                onDelete: "SET NULL"
            })
        );
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.dropTable("gem_transactions");
        await queryRunner.dropTable("follows");
        await queryRunner.dropTable("room_participants");
        await queryRunner.dropTable("rooms");
        await queryRunner.dropTable("users");
    }
}
