import { io, Socket } from 'socket.io-client';
import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';
import Constants from 'expo-constants';

const BASE_URL = 'https://sada.mustafin.dev';

console.log('🔌 Socket Base URL:', BASE_URL);

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

    sendSignal(roomId: string, signal: any) {
        this.socket?.emit('signal', { roomId, signal });
    }

    onSignal(callback: (data: { senderId: string, signal: any }) => void) {
        this.socket?.on('signal', callback);
    }

    offSignal() {
        this.socket?.off('signal');
    }

    private async getCurrentUser() {
        // Helper to get cached user info
        const json = await SecureStore.getItemAsync('user_profile'); // We need to store this on login!
        return json ? JSON.parse(json) : null;
    }
}

export const SocketService = new SocketServiceImpl();
