import { AppDataSource } from "../config/database";
import { Withdrawal, WithdrawalStatus, PayoutMethod } from "../models/Withdrawal";
import { User } from "../models/User";
import { NotificationService } from "./notification.service";
import { NotificationType } from "../models/Notification";

const withdrawalRepository = AppDataSource.getRepository(Withdrawal);
const userRepository = AppDataSource.getRepository(User);

export const MINIMUM_WITHDRAWAL = 1000;

export class WithdrawalService {
    static async requestWithdrawal(
        userId: string,
        amount: number,
        payoutMethod: PayoutMethod,
        payoutDetails?: Record<string, any>
    ) {
        if (amount < MINIMUM_WITHDRAWAL) {
            throw new Error(`Minimum withdrawal is ${MINIMUM_WITHDRAWAL} gems`);
        }

        const withdrawal = await AppDataSource.manager.transaction(async tx => {
            const user = await tx.findOne(User, { where: { id: userId } });
            if (!user) throw new Error("User not found");
            if (user.gem_balance < amount) throw new Error("Insufficient balance");

            // Deduct gems from user balance
            user.gem_balance -= amount;
            await tx.save(user);

            // Create pending withdrawal
            const w = new Withdrawal();
            w.user = user;
            w.amount = amount;
            w.status = WithdrawalStatus.PENDING;
            w.payout_method = payoutMethod;
            w.payout_details = payoutDetails || null;

            return await tx.save(w);
        });

        return withdrawal;
    }

    static async getWithdrawals(userId: string, limit = 20, offset = 0) {
        return await withdrawalRepository.find({
            where: { user: { id: userId } },
            order: { requested_at: "DESC" },
            take: limit,
            skip: offset,
        });
    }

    static async getPendingWithdrawals(limit = 20, offset = 0) {
        return await withdrawalRepository.find({
            where: { status: WithdrawalStatus.PENDING },
            order: { requested_at: "ASC" },
            take: limit,
            skip: offset,
            relations: ["user"],
        });
    }

    static async processWithdrawal(
        withdrawalId: string,
        adminId: string,
        approve: boolean,
        note?: string
    ) {
        const result = await AppDataSource.manager.transaction(async tx => {
            const w = await tx.findOne(Withdrawal, {
                where: { id: withdrawalId },
                relations: ["user"],
            });
            if (!w) throw new Error("Withdrawal not found");
            if (w.status !== WithdrawalStatus.PENDING) {
                throw new Error("Withdrawal is not pending");
            }

            if (approve) {
                w.status = WithdrawalStatus.APPROVED;
                // Stub: Stripe transfer would happen here
                w.stripe_transfer_id = `stub_${Date.now()}`;
            } else {
                w.status = WithdrawalStatus.REJECTED;
                // Refund gems to user
                w.user.gem_balance += w.amount;
                await tx.save(w.user);
            }

            w.processed_at = new Date();
            w.admin_note = note || null;

            return await tx.save(w);
        });

        // Send notification (outside transaction)
        const statusText = approve ? "approved" : "rejected";
        try {
            await NotificationService.create(
                (result as any).user.id,
                NotificationType.WITHDRAWAL,
                `Your withdrawal request for ${(result as any).amount} gems has been ${statusText}`,
                undefined,
                { withdrawalId, status: statusText, amount: (result as any).amount }
            );
        } catch (e) {
            console.warn("Failed to create withdrawal notification", e);
        }

        return result;
    }
}
