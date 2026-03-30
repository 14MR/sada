import { AppDataSource } from "../config/database";
import { Room } from "../models/Room";
import { GemTransaction } from "../models/GemTransaction";
import { User } from "../models/User";

const roomRepository = AppDataSource.getRepository(Room);
const gemRepository = AppDataSource.getRepository(GemTransaction);
const userRepository = AppDataSource.getRepository(User);

export class CreatorService {
    /** Full creator dashboard: stats, earnings summary, recent rooms */
    static async getDashboard(userId: string) {
        const user = await userRepository.findOneBy({ id: userId });
        if (!user) throw new Error("User not found");

        // Total rooms hosted
        const totalRooms = await roomRepository.count({
            where: { host_id: userId },
        });

        // Total listeners across all rooms (sum of peak listener_count)
        const listenerStats = await roomRepository
            .createQueryBuilder("room")
            .select("SUM(room.listener_count)", "totalListeners")
            .where("room.host_id = :userId", { userId })
            .getRawOne();

        // Total gems received
        const gemStats = await gemRepository
            .createQueryBuilder("tx")
            .select("SUM(tx.amount)", "totalGems")
            .where("tx.receiver_id = :userId", { userId })
            .getRawOne();

        // Average listeners per room
        const avgListeners = totalRooms > 0
            ? Math.round((parseInt(listenerStats?.totalListeners || "0")) / totalRooms)
            : 0;

        // Gems this month
        const thisMonth = new Date();
        thisMonth.setDate(1);
        thisMonth.setHours(0, 0, 0, 0);

        const monthlyGems = await gemRepository
            .createQueryBuilder("tx")
            .select("SUM(tx.amount)", "total")
            .where("tx.receiver_id = :userId", { userId })
            .andWhere("tx.created_at >= :thisMonth", { thisMonth })
            .getRawOne();

        // Recent 5 rooms
        const recentRooms = await roomRepository.find({
            where: { host_id: userId },
            order: { started_at: "DESC" },
            take: 5,
        });

        return {
            user: {
                id: user.id,
                username: user.username,
                gem_balance: user.gem_balance,
            },
            stats: {
                totalRooms,
                totalListeners: parseInt(listenerStats?.totalListeners || "0"),
                avgListenersPerRoom: avgListeners,
                totalGemsReceived: parseInt(gemStats?.totalGems || "0"),
                gemsThisMonth: parseInt(monthlyGems?.total || "0"),
            },
            recentRooms,
        };
    }

    /** Earnings breakdown with optional date range */
    static async getEarnings(userId: string, from?: Date, to?: Date) {
        const query = gemRepository
            .createQueryBuilder("tx")
            .leftJoinAndSelect("tx.sender", "sender")
            .where("tx.receiver_id = :userId", { userId });

        if (from) query.andWhere("tx.created_at >= :from", { from });
        if (to) query.andWhere("tx.created_at <= :to", { to });

        const transactions = await query.orderBy("tx.created_at", "DESC").getMany();

        const totalGems = transactions.reduce((sum, tx) => sum + tx.amount, 0);

        // Group by day for chart data
        const dailyMap = new Map<string, number>();
        for (const tx of transactions) {
            const day = tx.created_at.toISOString().split("T")[0];
            dailyMap.set(day, (dailyMap.get(day) || 0) + tx.amount);
        }

        return {
            totalGems,
            transactionCount: transactions.length,
            dailyBreakdown: Array.from(dailyMap.entries())
                .map(([date, amount]) => ({ date, amount }))
                .sort((a, b) => a.date.localeCompare(b.date)),
            recentTransactions: transactions.slice(0, 20),
        };
    }

    /** Rooms hosted by this creator with stats */
    static async getHostedRooms(userId: string, limit: number, offset: number) {
        const [rooms, total] = await roomRepository.findAndCount({
            where: { host_id: userId },
            order: { started_at: "DESC" },
            take: limit,
            skip: offset,
        });

        return { rooms, total, hasMore: offset + limit < total };
    }

    /** Top supporters — users who gifted the most gems */
    static async getTopSupporters(userId: string, limit: number) {
        return await gemRepository
            .createQueryBuilder("tx")
            .leftJoinAndSelect("tx.sender", "sender")
            .select("tx.sender_id", "userId")
            .addSelect("sender.username", "username")
            .addSelect("SUM(tx.amount)", "totalGems")
            .addSelect("COUNT(tx.id)", "giftCount")
            .where("tx.receiver_id = :userId", { userId })
            .groupBy("tx.sender_id")
            .addGroupBy("sender.username")
            .orderBy("totalGems", "DESC")
            .limit(limit)
            .getRawMany();
    }
}
