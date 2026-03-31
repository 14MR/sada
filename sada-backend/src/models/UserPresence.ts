import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn, Index } from "typeorm";
import { User } from "./User";

export enum PresenceStatus {
    ONLINE = "online",
    AWAY = "away",
    OFFLINE = "offline",
}

@Entity("user_presence")
export class UserPresence {
    @PrimaryGeneratedColumn("uuid")
    id!: string;

    @Column({ type: "uuid" })
    @Index({ unique: true })
    user_id!: string;

    @ManyToOne(() => User, { onDelete: "CASCADE" })
    @JoinColumn({ name: "user_id" })
    user!: User;

    @Column({ type: "enum", enum: PresenceStatus, default: PresenceStatus.OFFLINE })
    status!: PresenceStatus;

    @Column({ type: "timestamp", nullable: true })
    last_seen_at!: Date | null;

    @Column({ type: "uuid", nullable: true })
    current_room_id!: string | null;

    @CreateDateColumn()
    created_at!: Date;

    @UpdateDateColumn()
    updated_at!: Date;
}
