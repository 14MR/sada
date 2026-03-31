import { io, Socket } from 'socket.io-client';
import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';
import Constants from 'expo-constants';

const BASE_URL =
    process.env.EXPO_PUBLIC_SOCKET_URL || 'https://sada.mustafin.dev';

console.log('🔌 Socket Base URL:', BASE_URL);

/**
 * SocketService - handles real-time chat and room events via Socket.io.
 *
 * Audio is now handled via Cloudflare Calls SFU (see AudioService.ts).
 * Socket.io is kept for:
 *   - Text chat (send_message / receive_message)
 *   - Room join/leave events (for participant list UI updates)
 *   - Other real-time notifications
 *
 * Audio signaling (signal/offer/answer/candidate) has been removed since
 * the SFU handles all media routing through the backend REST API.
 */
class SocketServiceImpl {
    socket: Socket | null = null;

    async connect() {
        const token = await SecureStore.getItemAsync('auth_token');
        if (!token) {
            console.warn('Socket Connect: No token found');
            return;
        }

        this.socket = io(BASE_URL, {
            auth: { token },
            transports: ['websocket'],
        });

        this.socket.on('connect', () => {
            console.log('Socket Connected:', this.socket?.id);
        });

        this.socket.on('connect_error', (err) => {
            console.error('Socket Connection Error:', err);
        });
    }

    disconnect() {
        if (this.socket) {
            this.socket.disconnect();
            this.socket = null;
        }
    }

    joinRoom(roomId: string) {
        this.socket?.emit('join_room', roomId);
    }

    leaveRoom(roomId: string) {
        this.socket?.emit('leave_room', roomId);
    }

    async sendMessage(roomId: string, message: string) {
        const user = await this.getCurrentUser();
        this.socket?.emit('send_message', {
            roomId,
            message,
            userId: user?.id,
            username: user?.display_name
        });
    }

    onMessage(callback: (msg: any) => void) {
        this.socket?.on('receive_message', (data) => {
            // Map backend format to UI format
            callback({
                id: Math.random().toString(),
                sender: { display_name: data.username },
                content: data.message
            });
        });
    }

    offMessage() {
        this.socket?.off('receive_message');
    }

    /**
     * Listen for participant events (join/leave notifications).
     * Used to update the speaker/listener UI in real-time.
     */
    onParticipantUpdate(callback: (data: any) => void) {
        this.socket?.on('participant_update', callback);
    }

    offParticipantUpdate() {
        this.socket?.off('participant_update');
    }

    private async getCurrentUser() {
        // Helper to get cached user info
        const json = await SecureStore.getItemAsync('user_profile');
        return json ? JSON.parse(json) : null;
    }
}

export const SocketService = new SocketServiceImpl();
