import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne, JoinColumn, Index } from "typeorm";
import { User } from "./User";

export enum ActivityType {
    ROOM_CREATED = "room_created",
    FOLLOWER_GAINED = "follower_gained",
    GEM_RECEIVED = "gem_received",
    ROOM_JOINED = "room_joined",
}

@Entity("user_activities")
@Index(["userId", "createdAt"])
export class UserActivity {
    @PrimaryGeneratedColumn("uuid")
    id!: string;

    @Column({ type: "uuid" })
    @Index()
    userId!: string;

    @ManyToOne(() => User, { onDelete: "CASCADE" })
    @JoinColumn({ name: "userId" })
    user!: User;

    @Column({ type: "enum", enum: ActivityType })
    type!: ActivityType;

    @Column({ type: "json", nullable: true })
    metadata!: Record<string, any> | null;

    @CreateDateColumn({ name: "createdAt" })
    createdAt!: Date;
}
