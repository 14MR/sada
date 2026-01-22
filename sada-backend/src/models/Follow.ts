import { Entity, PrimaryGeneratedColumn, CreateDateColumn, ManyToOne, JoinColumn, Unique } from "typeorm";
import { User } from "./User";

@Entity("follows")
@Unique(["follower", "following"]) // Prevent duplicate follows
export class Follow {
    @PrimaryGeneratedColumn("uuid")
    id!: string;

    @ManyToOne(() => User, user => user.following, { onDelete: "CASCADE" })
    @JoinColumn({ name: "follower_id" })
    follower!: User;

    @ManyToOne(() => User, user => user.followers, { onDelete: "CASCADE" })
    @JoinColumn({ name: "following_id" })
    following!: User;

    @CreateDateColumn()
    created_at!: Date;
}
