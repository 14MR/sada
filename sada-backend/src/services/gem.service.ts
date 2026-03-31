import crypto from "crypto";
import { AppDataSource } from "../config/database";
import { GemTransaction, TransactionType } from "../models/GemTransaction";
import { User } from "../models/User";
import { ChatService } from "./chat.service";
import { NotificationService } from "./notification.service";
import { NotificationType } from "../models/Notification";
import { BlockService } from "./block.service";
import { ActivityService } from "./activity.service";
import { ActivityType } from "../models/UserActivity";
import logger from "../config/logger";

// In-memory receipt hash store for idempotency (prod should use Redis/DB)
const processedReceipts = new Map<string, string>();

export class PaymentService {
    /** Verify Apple App Store purchase receipt */
    static async verifyApplePurchase(receiptData: string): Promise<{ valid: boolean; transactionId?: string }> {
        if (process.env.NODE_ENV === "test") {
            return { valid: true, transactionId: `apple_test_${Date.now()}` };
        }

        // TODO: Integrate with Apple App Store Server API v2
        // - Decode JWS receipt from Apple
        // - Verify signature against Apple's root CA
        // - Validate bundleId, environment, transactionId
        throw new Error("Apple purchase verification not yet configured for production");
    }

    /** Verify Google Play purchase receipt */
    static async verifyGooglePurchase(receiptData: string, productId: string): Promise<{ valid: boolean; transactionId?: string }> {
        if (process.env.NODE_ENV === "test") {
            return { valid: true, transactionId: `google_test_${Date.now()}` };
        }

        // TODO: Integrate with Google Play Developer API
        // - Use service account credentials
        // - Call purchases.products.get or purchases.subscriptionsv2.get
        // - Verify purchaseState, consumptionState, orderId
        throw new Error("Google purchase verification not yet configured for production");
    }

    /** Compute receipt hash for idempotency */
    static receiptHash(receiptData: string): string {
        return crypto.createHash("sha256").update(receiptData).digest("hex");
    }

    /** Atomically check-and-reserve a receipt hash. Returns true if it was already claimed. */
    static tryClaim(receiptHash: string): boolean {
        if (processedReceipts.has(receiptHash)) {
            return true; // already claimed — duplicate
        }
        processedReceipts.set(receiptHash, "pending");
        return false;
    }

    /** Update receipt record with real transaction ID after commit */
    static markProcessed(receiptHash: string, transactionId: string): void {
        processedReceipts.set(receiptHash, transactionId);
    }

    /** Remove a claimed receipt if the transaction failed (rollback) */
    static releaseClaim(receiptHash: string): void {
        processedReceipts.delete(receiptHash);
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
        if (receiptData) {
            const verification = platform === "google"
                ? await PaymentService.verifyGooglePurchase(receiptData, `gems_${amount}`)
                : await PaymentService.verifyApplePurchase(receiptData);

            if (!verification.valid) {
                throw new Error("Payment verification failed");
            }
        }

        // Atomically check-and-reserve the receipt hash BEFORE the async transaction.
        // This prevents the TOCTOU race where two concurrent requests both pass
        // isDuplicate() at their respective await boundaries.
        let receiptHash: string | null = null;
        if (receiptData) {
            receiptHash = PaymentService.receiptHash(receiptData);
            if (PaymentService.tryClaim(receiptHash)) {
                throw new Error("Duplicate purchase — receipt already processed");
            }
        }

        try {
            const txResult = await AppDataSource.manager.transaction(async transactionalEntityManager => {
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
                return { saved, transactionId: saved.id };
            });

            // Update the claim with the real transaction ID after commit
            if (receiptHash) {
                PaymentService.markProcessed(receiptHash, txResult.transactionId);
            }
            return txResult.saved;
        } catch (err) {
            // Release the claim if the transaction failed so the receipt can be retried
            if (receiptHash) {
                PaymentService.releaseClaim(receiptHash);
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
