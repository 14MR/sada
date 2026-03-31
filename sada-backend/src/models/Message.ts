import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne, JoinColumn, Index } from "typeorm";
import { Conversation } from "./Conversation";
import { User } from "./User";

export enum MessageType {
    TEXT = "text",
    IMAGE = "image",
    GIFT = "gift",
}

@Entity("messages")
export class Message {
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
    senderId!: string;

    @ManyToOne(() => User, { onDelete: "CASCADE" })
    @JoinColumn({ name: "senderId" })
    sender!: User;

    @Column("text")
    content!: string;

    @Column({ type: "enum", enum: MessageType, default: MessageType.TEXT })
    type!: MessageType;

    @Column({ type: "json", nullable: true })
    metadata!: Record<string, any> | null;

    @CreateDateColumn()
    created_at!: Date;

    @Column({ type: "timestamp", nullable: true })
    edited_at!: Date | null;

    @Column({ type: "timestamp", nullable: true })
    deleted_at!: Date | null;
}
