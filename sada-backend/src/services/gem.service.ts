import { AppDataSource } from "../config/database";
import { GemTransaction, TransactionType } from "../models/GemTransaction";
import { User } from "../models/User";
import { ChatService } from "./chat.service";
import { NotificationService } from "./notification.service";
import { NotificationType } from "../models/Notification";

export class GemService {
    static async purchaseGems(userId: string, amount: number) {
        if (amount <= 0) throw new Error("Amount must be positive");

        return await AppDataSource.manager.transaction(async transactionalEntityManager => {
            const user = await transactionalEntityManager.findOne(User, { where: { id: userId } });
            if (!user) throw new Error("User not found");

            user.gem_balance += amount;
            await transactionalEntityManager.save(user);

            const tx = new GemTransaction();
            tx.receiver = user;
            tx.amount = amount;
            tx.type = TransactionType.PURCHASE;

            return await transactionalEntityManager.save(tx);
        });
    }

    static async sendGift(senderId: string, receiverId: string, amount: number, roomId?: string) {
        if (amount <= 0) throw new Error("Amount must be positive");
        if (senderId === receiverId) throw new Error("Cannot gift yourself");

        const savedTx = await AppDataSource.manager.transaction(async transactionalEntityManager => {
            const sender = await transactionalEntityManager.findOne(User, { where: { id: senderId } });
            const receiver = await transactionalEntityManager.findOne(User, { where: { id: receiverId } });

            if (!sender || !receiver) throw new Error("User not found");
            if (sender.gem_balance < amount) throw new Error("Insufficient balance");

            sender.gem_balance -= amount;
            await transactionalEntityManager.save(sender);

            receiver.gem_balance += amount;
            await transactionalEntityManager.save(receiver);

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
                senderId,
                amount
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
                { senderId, amount }
            );
        } catch (e) {
            console.warn("Failed to create notification", e);
        }

        return savedTx;
    }

    static async getBalance(userId: string) {
        const userRepository = AppDataSource.getRepository(User);
        const user = await userRepository.findOneBy({ id: userId });
        if (!user) throw new Error("User not found");
        return { balance: user.gem_balance };
    }

    static async getHistory(userId: string) {
        const transactionRepository = AppDataSource.getRepository(GemTransaction);
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
