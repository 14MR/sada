import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne, JoinColumn, Index } from "typeorm";
import { User } from "./User";

export enum NotificationPreferenceType {
    ROOM_STARTED = "room_started",
    ROOM_SCHEDULED = "room_scheduled",
    NEW_FOLLOWER = "new_follower",
    GEM_RECEIVED = "gem_received",
    SPEAKER_REQUEST = "speaker_request",
    CHAT_MESSAGE = "chat_message",
}

@Entity("notification_preferences")
export class NotificationPreference {
    @PrimaryGeneratedColumn("uuid")
    id!: string;

    @Column({ type: "uuid" })
    @Index()
    user_id!: string;

    @ManyToOne(() => User, { onDelete: "CASCADE" })
    @JoinColumn({ name: "user_id" })
    user!: User;

    @Column({ type: "enum", enum: NotificationPreferenceType })
    type!: NotificationPreferenceType;

    @Column({ default: true })
    enabled!: boolean;

    @CreateDateColumn()
    created_at!: Date;
}
