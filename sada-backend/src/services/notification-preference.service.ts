import { AppDataSource } from "../config/database";
import { NotificationPreference, NotificationPreferenceType } from "../models/NotificationPreference";

const preferenceRepository = AppDataSource.getRepository(NotificationPreference);

const ALL_TYPES = Object.values(NotificationPreferenceType);

export class NotificationPreferenceService {
    static async getForUser(userId: string): Promise<NotificationPreference[]> {
        let preferences = await preferenceRepository.find({
            where: { user_id: userId },
        });

        // Ensure all types exist for the user (create missing ones with enabled=true)
        if (preferences.length < ALL_TYPES.length) {
            const existingTypes = new Set(preferences.map((p) => p.type));
            const missing = ALL_TYPES.filter((t) => !existingTypes.has(t));

            if (missing.length > 0) {
                const newPrefs = missing.map((type) =>
                    preferenceRepository.create({ user_id: userId, type, enabled: true })
                );
                const saved = await preferenceRepository.save(newPrefs);
                preferences = [...preferences, ...saved];
            }
        }

        return preferences;
    }

    static async bulkUpdate(
        userId: string,
        updates: { type: NotificationPreferenceType; enabled: boolean }[]
    ): Promise<NotificationPreference[]> {
        for (const { type, enabled } of updates) {
            let pref = await preferenceRepository.findOne({
                where: { user_id: userId, type },
            });

            if (!pref) {
                pref = preferenceRepository.create({ user_id: userId, type, enabled });
            } else {
                pref.enabled = enabled;
            }

            await preferenceRepository.save(pref);
        }

        return await this.getForUser(userId);
    }

    static async isEnabled(userId: string, type: NotificationPreferenceType): Promise<boolean> {
        const pref = await preferenceRepository.findOne({
            where: { user_id: userId, type },
        });
        // Default to enabled if no preference set
        return pref ? pref.enabled : true;
    }
}
