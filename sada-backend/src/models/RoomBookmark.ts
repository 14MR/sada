import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne, JoinColumn, Index, Unique } from "typeorm";
import { User } from "./User";
import { Room } from "./Room";

@Entity("room_bookmarks")
@Unique(["user_id", "room_id"])
export class RoomBookmark {
    @PrimaryGeneratedColumn("uuid")
    id!: string;

    @Column()
    @Index()
    user_id!: string;

    @ManyToOne(() => User, { onDelete: "CASCADE" })
    @JoinColumn({ name: "user_id" })
    user!: User;

    @Column()
    room_id!: string;

    @ManyToOne(() => Room, { onDelete: "CASCADE" })
    @JoinColumn({ name: "room_id" })
    room!: Room;

    @CreateDateColumn()
    created_at!: Date;
}
