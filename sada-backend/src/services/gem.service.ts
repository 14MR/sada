import { AppDataSource } from "../config/database";
import { GemTransaction, TransactionType } from "../models/GemTransaction";
import { User } from "../models/User";
import { ChatService } from "./chat.service";
import { NotificationService } from "./notification.service";
import { NotificationType } from "../models/Notification";

const transactionRepository = AppDataSource.getRepository(GemTransaction);
const userRepository = AppDataSource.getRepository(User);

export class GemService {
    // Mock purchase: Add gems to user wallet
    static async purchaseGems(userId: string, amount: number) {
        if (amount <= 0) throw new Error("Amount must be positive");

        const user = await userRepository.findOneBy({ id: userId });
        if (!user) throw new Error("User not found");

        // Update balance
        user.gem_balance += amount;
        await userRepository.save(user);

        // Record Transaction
        const tx = new GemTransaction();
        tx.receiver = user;
        tx.amount = amount;
        tx.type = TransactionType.PURCHASE;

        return await transactionRepository.save(tx);
    }

    // Gift gems from one user to another (e.g., in a room)
    static async sendGift(senderId: string, receiverId: string, amount: number, roomId?: string) {
        if (amount <= 0) throw new Error("Amount must be positive");
        if (senderId === receiverId) throw new Error("Cannot gift yourself");

        const savedTx = await AppDataSource.manager.transaction(async transactionalEntityManager => {
            const sender = await transactionalEntityManager.findOne(User, { where: { id: senderId } });
            const receiver = await transactionalEntityManager.findOne(User, { where: { id: receiverId } });

            if (!sender || !receiver) throw new Error("User not found");
            if (sender.gem_balance < amount) throw new Error("Insufficient balance");

            // Deduct from sender
            sender.gem_balance -= amount;
            await transactionalEntityManager.save(sender);

            // Add to receiver
            receiver.gem_balance += amount;
            await transactionalEntityManager.save(receiver);

            // Record Transaction
            const tx = new GemTransaction();
            tx.sender = sender;
            tx.receiver = receiver;
            tx.amount = amount;
            tx.type = TransactionType.GIFT;
            if (roomId) tx.reference_id = roomId;

            return await transactionalEntityManager.save(tx);
        });

        // Notify Receiver (outside transaction so notification failure doesn't roll back the gem transfer)
        try {
            ChatService.getInstance().sendToUser(receiverId, "notification", {
                type: "gift_received",
                message: `You received ${amount} gems!`,
                senderId: senderId,
                amount: amount
            });
        } catch (e) {
            console.warn("Failed to send socket notification", e);
        }

        try {
            await NotificationService.create(
                receiverId,
                NotificationType.GIFT,
                `You received ${amount} gems!`,
                undefined,
                { senderId: senderId, amount }
            );
        } catch (e) {
            console.warn("Failed to create notification", e);
        }

        return savedTx;
    }

    static async getBalance(userId: string) {
        const user = await userRepository.findOneBy({ id: userId });
        if (!user) throw new Error("User not found");
        return { balance: user.gem_balance };
    }

    static async getHistory(userId: string) {
        return await transactionRepository.find({
            where: [
                { receiver: { id: userId } },
                { sender: { id: userId } }
            ],
            order: { created_at: "DESC" },
            relations: ["sender", "receiver"]
        });
    }
}
