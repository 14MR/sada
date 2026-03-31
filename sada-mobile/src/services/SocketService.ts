import { io, Socket } from 'socket.io-client';
import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';
import Constants from 'expo-constants';
import { ENV } from '../config/env';

console.log('🔌 Socket Base URL:', ENV.SOCKET_BASE_URL);

class SocketServiceImpl {
    socket: Socket | null = null;
    private isConnected: boolean = false;
    
    async connect() {
        const token = await SecureStore.getItemAsync('auth_token');
        if (!token) {
            console.warn('Socket Connect: No token found');
            return;
        }
        
        // If already connected, don't reconnect
        if (this.socket && this.isConnected) {
            console.log('♻️ Socket already connected, skipping');
            return;
        }
        
        console.log('🔌 Connecting to socket:', ENV.SOCKET_BASE_URL);
        console.log('🔑 Using token:', token.substring(0, 20) + '...'); 
        
        this.socket = io(ENV.SOCKET_BASE_URL, {
            auth: { token },
            transports: ['websocket'],
            reconnection: true,
            reconnectionAttempts: 5,
        });
        
        this.socket.on('connect', () => {
            console.log('✅ Socket Connected:', this.socket?.id);
            this.isConnected = true;
        });
        
        this.socket.on('connect_error', (err) => {
            console.error('❌ Socket Connection Error:', err);
            this.isConnected = false;
        });
        
        this.socket.on('disconnect', (reason) => {
            console.warn('⚠️ Socket Disconnected:', reason);
            this.isConnected = false;
        });
    }

    disconnect() {
        if (this.socket) {
            this.socket.disconnect();
            this.socket = null;
        }
    }

    joinRoom(roomId: string) {
        console.log('🏠 Joining room:', roomId);
        console.log('🔌 Socket status:', this.socket?.connected ? 'CONNECTED' : 'DISCONNECTED');
        console.log('🔌 Socket ID:', this.socket?.id);
        this.socket?.emit('join_room', roomId);
    }

    leaveRoom(roomId: string) {
        this.socket?.emit('leave_room', roomId);
    }

    async sendMessage(roomId: string, message: string) {
        const user = await this.getCurrentUser();
        
        // Fallback: If user_profile not stored, use user_id
        const userId = user?.id || await SecureStore.getItemAsync('user_id');
        const username = user?.display_name || 'Anonymous';
        
        const messageData = { roomId, message, userId, username };
        console.log('📤 Sending message:', messageData);
        console.log('🔌 Socket connected:', !!this.socket?.connected);
        console.log('🔌 Socket ID:', this.socket?.id);
        
        this.socket?.emit('send_message', messageData);
    }

    onMessage(callback: (msg: any) => void) {
        this.socket?.on('receive_message', (data) => {
            console.log('📩 Received message:', data);
            // Map backend format to UI format
            callback({
                id: Math.random().toString(),
                sender: { display_name: data.username },
                content: data.message
            });
        });
        console.log('📩 Subscribed to receive_message');
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
