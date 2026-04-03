import client from './client';

export interface Notification {
    id: string;
    type: string;
    title: string;
    body: string;
    created_at: string;
    read: boolean;
}

export const NotificationService = {
    getNotifications: async (): Promise<Notification[]> => {
        const response = await client.get('/notifications');
        return response.data;
    },

    markAsRead: async (id: string) => {
        await client.patch(`/notifications/${id}/read`);
    }
};
