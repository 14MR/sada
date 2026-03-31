import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, OneToMany } from "typeorm";
import { ConversationParticipant } from "./ConversationParticipant";
import { Message } from "./Message";

export enum ConversationType {
    DIRECT = "direct",
    GROUP = "group",
}

@Entity("conversations")
export class Conversation {
    @PrimaryGeneratedColumn("uuid")
    id!: string;

    @Column({ type: "enum", enum: ConversationType, default: ConversationType.DIRECT })
    type!: ConversationType;

    @Column({ type: "varchar", nullable: true, length: 100 })
    name!: string | null;

    @OneToMany(() => ConversationParticipant, participant => participant.conversation)
    participants!: ConversationParticipant[];

    @OneToMany(() => Message, message => message.conversation)
    messages!: Message[];

    @CreateDateColumn()
    created_at!: Date;

    @UpdateDateColumn()
    updated_at!: Date;
}
