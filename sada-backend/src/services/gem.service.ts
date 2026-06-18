import { AppDataSource } from "../config/database";
import { GemTransaction, TransactionType } from "../models/GemTransaction";
import { PaymentReceipt, PaymentReceiptStatus } from "../models/PaymentReceipt";
import { User } from "../models/User";
import { ChatService } from "./chat.service";
import { NotificationService } from "./notification.service";
import { NotificationType } from "../models/Notification";
import { BlockService } from "./block.service";
import { ActivityService } from "./activity.service";
import { ActivityType } from "../models/UserActivity";
import { PaymentVerificationService } from "./payment-verification.service";
import logger from "../config/logger";

const giftLocks = new Map<string, Promise<void>>();

export class DuplicatePurchaseError extends Error {
    constructor() {
        super("Duplicate purchase — receipt already processed");
        this.name = "DuplicatePurchaseError";
    }
}

async function withGiftLock<T>(senderId: string, fn: () => Promise<T>): Promise<T> {
    const previous = giftLocks.get(senderId) ?? Promise.resolve();
    let release!: () => void;
    const current = new Promise<void>(resolve => {
        release = resolve;
    });
    const chained = previous.then(() => current, () => current);
    giftLocks.set(senderId, chained);

    await previous.catch(() => {});
    try {
        return await fn();
    } finally {
        release();
        if (giftLocks.get(senderId) === chained) {
            giftLocks.delete(senderId);
        }
    }
}

export class GemService {
    static async purchaseGems(userId: string, amount: number, receiptData?: string, platform?: "apple" | "google") {
        if (amount <= 0) throw new Error("Amount must be positive");

        // Require receipt verification outside of test environment
        if (process.env.NODE_ENV !== "test" && !receiptData) {
            throw new Error("Payment receipt is required");
        }

        // Payment verification when receipt is provided
        let providerTransactionId: string | undefined;
        if (receiptData) {
            const productId = `gems_${amount}`;
            const verification = platform === "google"
                ? await PaymentVerificationService.verifyGooglePurchase(receiptData, productId)
                : await PaymentVerificationService.verifyApplePurchase(receiptData, productId);

            if (!verification.valid) {
                throw new Error("Payment verification failed");
            }
            providerTransactionId = verification.transactionId;
        }

        let receiptHash: string | null = null;
        if (receiptData) {
            receiptHash = PaymentVerificationService.receiptHash(receiptData);
        }

        try {
            return await AppDataSource.manager.transaction(async transactionalEntityManager => {
                const user = await transactionalEntityManager.findOne(User, { where: { id: userId } });
                if (!user) throw new Error("User not found");

                user.gem_balance += amount;
                await transactionalEntityManager.save(user);

                const tx = new GemTransaction();
                tx.receiver = user;
                tx.amount = amount;
                tx.type = TransactionType.PURCHASE;
                if (receiptHash) {
                    tx.reference_id = receiptHash;
                }

                const saved = await transactionalEntityManager.save(tx);

                if (receiptHash) {
                    const receipt = new PaymentReceipt();
                    receipt.receipt_hash = receiptHash;
                    receipt.platform = platform || "apple";
                    receipt.amount = amount;
                    receipt.status = PaymentReceiptStatus.PROCESSED;
                    receipt.provider_transaction_id = providerTransactionId || null;
                    receipt.gem_transaction_id = saved.id;
                    await transactionalEntityManager.insert(PaymentReceipt, receipt);
                }

                return saved;
            });
        } catch (err) {
            if (receiptHash && PaymentVerificationService.isDuplicateReceiptError(err)) {
                throw new DuplicatePurchaseError();
            }
            throw err;
        }
    }

    static async sendGift(senderId: string, receiverId: string, amount: number, roomId?: string) {
        if (amount <= 0) throw new Error("Amount must be positive");
        if (senderId === receiverId) throw new Error("Cannot gift yourself");

        // Block enforcement: check if either user has blocked the other
        const isBlocked = await BlockService.isBlocked(senderId, receiverId);
        if (isBlocked) throw new Error("Cannot send gems to this user");

        const savedTx = await withGiftLock(senderId, () => AppDataSource.manager.transaction(async transactionalEntityManager => {
            const receiver = await transactionalEntityManager.findOne(User, { where: { id: receiverId } });
            if (!receiver) throw new Error("User not found");

            const debited = await transactionalEntityManager
                .createQueryBuilder()
                .update(User)
                .set({ gem_balance: () => "gem_balance - :amount" })
                .where("id = :senderId", { senderId })
                .andWhere("gem_balance >= :amount", { amount })
                .execute();

            if (!debited.affected) {
                const senderExists = await transactionalEntityManager.exists(User, { where: { id: senderId } });
                if (!senderExists) throw new Error("User not found");
                throw new Error("Insufficient balance");
            }

            await transactionalEntityManager.increment(User, { id: receiverId }, "gem_balance", amount);

            const tx = new GemTransaction();
            tx.sender = { id: senderId } as User;
            tx.receiver = receiver;
            tx.amount = amount;
            tx.type = TransactionType.GIFT;
            if (roomId) tx.reference_id = roomId;

            return await transactionalEntityManager.save(tx);
        }));

        // Notify Receiver (outside transaction so notification failure doesn't roll back the gem transfer)
        try {
            ChatService.getInstance().sendToUser(receiverId, "notification", {
                type: "gift_received",
                message: `You received ${amount} gems!`,
                senderId,
                amount
            });
        } catch (e) {
            logger.warn({ err: e }, "Failed to send socket notification");
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
            logger.warn({ err: e }, "Failed to create notification");
        }

        // Record activity for receiver (fire-and-forget)
        ActivityService.record(receiverId, ActivityType.GEM_RECEIVED, { senderId, amount, roomId }).catch(() => {});

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
