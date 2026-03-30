import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne, JoinColumn, Index } from "typeorm";
import { User } from "./User";
import { Room } from "./Room";

/**
 * Speaker request queue — users raise hand to request speaking role.
 * Host sees a queue and can approve/reject.
 */
@Entity("speaker_requests")
export class SpeakerRequest {
    @PrimaryGeneratedColumn("uuid")
    id!: string;

    @ManyToOne(() => Room, { onDelete: "CASCADE" })
    @JoinColumn({ name: "room_id" })
    room!: Room;

    @Column({ type: "uuid" })
    @Index()
    room_id!: string;

    @ManyToOne(() => User, { onDelete: "CASCADE" })
    @JoinColumn({ name: "user_id" })
    user!: User;

    @Column({ type: "uuid" })
    @Index()
    user_id!: string;

    @Column({ length: 20, default: "pending" })
    @Index()
    status!: "pending" | "approved" | "rejected" | "cancelled";

    @Column({ type: "text", nullable: true })
    message!: string | null; // Optional: why they want to speak

    @CreateDateColumn()
    created_at!: Date;

    @Column({ nullable: true })
    resolved_at!: Date | null;

    @Column({ type: "uuid", nullable: true })
    resolved_by!: string | null; // Host who approved/rejected
}
