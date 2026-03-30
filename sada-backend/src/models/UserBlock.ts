import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne, JoinColumn, Index, Unique } from "typeorm";
import { User } from "./User";

/**
 * User blocks — bidirectional block, either user can block the other.
 * Blocked user cannot: join same room, send gems, follow, chat.
 */
@Entity("user_blocks")
@Unique(["blocker_id", "blocked_id"])
export class UserBlock {
    @PrimaryGeneratedColumn("uuid")
    id!: string;

    @Column({ type: "uuid" })
    @Index()
    blocker_id!: string;

    @ManyToOne(() => User, { onDelete: "CASCADE" })
    @JoinColumn({ name: "blocker_id" })
    blocker!: User;

    @Column({ type: "uuid" })
    blocked_id!: string;

    @ManyToOne(() => User, { onDelete: "CASCADE" })
    @JoinColumn({ name: "blocked_id" })
    blocked!: User;

    @CreateDateColumn()
    created_at!: Date;
}
