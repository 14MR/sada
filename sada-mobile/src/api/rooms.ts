import client from './client';
import { User } from './auth';

export interface Room {
    id: string;
    title: string;
    description: string;
    category: string;
    host_id: string;
    host: User;
    status: string;
    listener_count: number;
    started_at: string;
}

export const RoomService = {
    getRooms: async (category?: string): Promise<Room[]> => {
        const response = await client.get('/rooms', {
            params: { category }
        });
        return response.data;
    },

    createRoom: async (title: string, category: string, description?: string, userId?: string) => {
        // userId is technically optional if auth token covers it, 
        // but our current backend controller might expect it in body for MVP simplicity.
        // Let's check backend logic: RoomController.create pulls userId from body.
        const response = await client.post('/rooms', {
            title,
            category,
            description,
            userId
        });
        return response.data;
    },

    getRoom: async (id: string): Promise<Room> => {
        const response = await client.get(`/rooms/${id}`);
        return response.data;
    }
};
