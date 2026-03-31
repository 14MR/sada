import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne, JoinColumn, Index } from "typeorm";
import { User } from "./User";
import { Room } from "./Room";

@Entity("room_invites")
export class RoomInvite {
    @PrimaryGeneratedColumn("uuid")
    id!: string;

    @Column({ type: "uuid", name: "room_id" })
    @Index()
    roomId!: string;

    @ManyToOne(() => Room, { onDelete: "CASCADE" })
    @JoinColumn({ name: "room_id" })
    room!: Room;

    @Column({ type: "uuid", name: "inviter_id" })
    inviterId!: string;

    @ManyToOne(() => User, { onDelete: "CASCADE" })
    @JoinColumn({ name: "inviter_id" })
    inviter!: User;

    @Column({ type: "uuid", nullable: true, name: "invitee_id" })
    inviteeId!: string | null;

    @ManyToOne(() => User, { onDelete: "SET NULL" })
    @JoinColumn({ name: "invitee_id" })
    invitee!: User | null;

    @Column({ type: "varchar", length: 32, nullable: true, unique: true, name: "invite_code" })
    inviteCode!: string | null;

    @Column({ type: "varchar", length: 10 })
    type!: string; // 'direct' | 'link'

    @Column({ type: "int", nullable: true, name: "max_uses" })
    maxUses!: number | null;

    @Column({ type: "int", default: 0, name: "uses" })
    uses!: number;

    @Column({ type: "timestamp", nullable: true, name: "expires_at" })
    expiresAt!: Date | null;

    @CreateDateColumn({ name: "created_at" })
    createdAt!: Date;
}
