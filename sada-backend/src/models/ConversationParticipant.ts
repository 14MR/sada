import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne, JoinColumn, Index, Unique } from "typeorm";
import { Conversation } from "./Conversation";
import { User } from "./User";

export enum ParticipantRole {
    ADMIN = "admin",
    MEMBER = "member",
}

@Entity("conversation_participants")
@Unique(["conversationId", "userId"])
export class ConversationParticipant {
    @PrimaryGeneratedColumn("uuid")
    id!: string;

    @Column({ type: "uuid" })
    @Index()
    conversationId!: string;

    @ManyToOne(() => Conversation, { onDelete: "CASCADE" })
    @JoinColumn({ name: "conversationId" })
    conversation!: Conversation;

    @Column({ type: "uuid" })
    @Index()
    userId!: string;

    @ManyToOne(() => User, { onDelete: "CASCADE" })
    @JoinColumn({ name: "userId" })
    user!: User;

    @Column({ type: "enum", enum: ParticipantRole, default: ParticipantRole.MEMBER })
    role!: ParticipantRole;

    @CreateDateColumn()
    joined_at!: Date;

    @Column({ type: "timestamp", nullable: true })
    last_read_at!: Date | null;
}
