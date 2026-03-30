import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne, JoinColumn, Index } from "typeorm";
import { User } from "./User";

@Entity("chat_reactions")
@Index(["message_id", "user_id", "emoji"], { unique: true })
export class ChatReaction {
    @PrimaryGeneratedColumn("uuid")
    id!: string;

    @Column()
    @Index()
    message_id!: string;

    @Column()
    @Index()
    room_id!: string;

    @Column()
    @Index()
    user_id!: string;

    @ManyToOne(() => User, { onDelete: "CASCADE" })
    @JoinColumn({ name: "user_id" })
    user!: User;

    @Column({ length: 10 })
    emoji!: string;

    @CreateDateColumn()
    created_at!: Date;
}
