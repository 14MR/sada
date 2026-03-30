import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, OneToMany, Index } from "typeorm";
import { RoomParticipant } from "./RoomParticipant";
import { Follow } from "./Follow";

@Entity("users")
export class User {
    @PrimaryGeneratedColumn("uuid")
    id!: string;

    @Column({ unique: true })
    apple_id!: string;

    @Index()
    @Column({ length: 50, unique: true })
    username!: string;

    @Column({ length: 100, nullable: true })
    display_name!: string;

    @Column({ type: "varchar", nullable: true, length: 500 })
    bio!: string;

    @Column({ nullable: true })
    avatar_url!: string;

    @Column({ default: false })
    is_creator!: boolean;

    @Column({ nullable: true, length: 50 })
    twitter_handle!: string;

    @Column({ nullable: true, length: 50 })
    instagram_handle!: string;

    @Column({ default: false })
    verified!: boolean;

    @Column({ default: false })
    banned!: boolean;

    @Column({ default: 'en' })
    language!: string;

    @Column({ default: 0 })
    gem_balance!: number; // Stored as integer

    @OneToMany(() => Follow, follow => follow.following)
    followers!: Follow[];

    @OneToMany(() => Follow, follow => follow.follower)
    following!: Follow[];

    @CreateDateColumn()
    created_at!: Date;

    @UpdateDateColumn()
    updated_at!: Date;
}
