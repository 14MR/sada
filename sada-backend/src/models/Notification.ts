import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne, JoinColumn, Index } from "typeorm";
import { User } from "./User";

export enum NotificationType {
    ROOM_STARTED = "room_started",
    FOLLOW = "follow",
    GIFT = "gift",
    SPEAKER_APPROVED = "speaker_approved",
    SPEAKER_REJECTED = "speaker_rejected",
    ROOM_SCHEDULED = "room_scheduled",
    WITHDRAWAL = "withdrawal",
}

@Entity("notifications")
export class Notification {
    @PrimaryGeneratedColumn("uuid")
    id!: string;

    @Column()
    @Index()
    user_id!: string;

    @ManyToOne(() => User, { onDelete: "CASCADE" })
    @JoinColumn({ name: "user_id" })
    user!: User;

    @Column({
        type: "enum",
        enum: NotificationType,
    })
    type!: NotificationType;

    @Column({ length: 255 })
    title!: string;

    @Column("text", { nullable: true })
    body!: string | null;

    @Column("simple-json", { nullable: true })
    data!: Record<string, any> | null;

    @Column({ default: false })
    read!: boolean;

    @CreateDateColumn()
    created_at!: Date;
}
