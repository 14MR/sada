import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { theme } from '../theme';
import { AudioService } from '../services/AudioService';
import { SocketService } from '../services/SocketService';
import { ChatOverlay } from '../components/ChatOverlay';
import * as SecureStore from 'expo-secure-store';
import { Room } from '../api/rooms';
import client from '../api/client';

export const RoomScreen = ({ route, navigation }: any) => {
    const { room } = route.params as { room: Room };
    const [isMuted, setIsMuted] = useState(true);
    const [isConnected, setIsConnected] = useState(false);
    const [speakers, setSpeakers] = useState([room.host]);
    const [listeners, setListeners] = useState<any[]>([]);

    useEffect(() => {
        const setupRoom = async () => {
            try {
                // 1. Init local microphone
                await AudioService.init();

                // 2. Join room via REST API (for participant tracking)
                const userId = await SecureStore.getItemAsync('user_id');
                const response = await client.post(`/rooms/${room.id}/join`, { userId });

                // 3. Connect Socket.io for chat and participant events
                await SocketService.connect();
                SocketService.joinRoom(room.id);

                // 4. Listen for participant updates
                SocketService.onParticipantUpdate((data) => {
                    if (data.speakers) setSpeakers(data.speakers);
                    if (data.listeners) setListeners(data.listeners);
                });

                // 5. Join SFU audio session
                const role = room.host?.id === userId ? 'host' : 'listener';
                const success = await AudioService.joinRoom(room.id, role);
                setIsConnected(success);

            } catch (err) {
                console.error("Failed to setup room:", err);
            }
        };

        setupRoom();

        return () => {
            // Cleanup on unmount
            AudioService.leaveRoom();
            SocketService.offParticipantUpdate();
            SocketService.leaveRoom(room.id);
            SocketService.disconnect();
        };
    }, []);

    const toggleMute = async () => {
        const nowEnabled = await AudioService.toggleMute();
        setIsMuted(!nowEnabled);
    };

    const handleLeave = async () => {
        await AudioService.leaveRoom();
        SocketService.offParticipantUpdate();
        SocketService.leaveRoom(room.id);
        SocketService.disconnect();
        navigation.goBack();
    };

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.header}>
                <TouchableOpacity onPress={handleLeave}>
                    <Text style={styles.leaveText}>✌️ Leave</Text>
                </TouchableOpacity>
                <Text style={styles.roomTitle}>{room.title}</Text>
                <View style={styles.liveBadge}>
                    <Text style={styles.liveText}>LIVE</Text>
                </View>
            </View>

            <ScrollView contentContainerStyle={styles.grid}>
                <Text style={styles.sectionHeader}>Speakers</Text>
                <View style={styles.speakerRow}>
                    {speakers.map((speaker, index) => (
                        <View key={speaker.id || index} style={styles.gridItem}>
                            <View style={[styles.avatar, styles.hostBorder]}>
                                <Text style={styles.avatarText}>{speaker.display_name?.[0]}</Text>
                            </View>
                            <Text style={styles.name}>{speaker.display_name} 🎤</Text>
                        </View>
                    ))}
                    {/* Placeholder for other speakers */}
                    <View style={styles.gridItem}>
                        <View style={styles.avatar}>
                            <Text style={styles.avatarText}>+</Text>
                        </View>
                        <Text style={styles.name}>Invite</Text>
                    </View>
                </View>

                <Text style={styles.sectionHeader}>Listeners ({listeners.length})</Text>
                <View style={styles.listenerRow}>
                    {listeners.length > 0 ? (
                        listeners.map((listener, index) => (
                            <View key={listener.id || index} style={styles.gridItem}>
                                <View style={styles.avatar}>
                                    <Text style={styles.avatarText}>{listener.display_name?.[0]}</Text>
                                </View>
                                <Text style={styles.name}>{listener.display_name}</Text>
                            </View>
                        ))
                    ) : (
                        <Text style={{ color: theme.colors.textSecondary }}>No listeners yet...</Text>
                    )}
                </View>

            </ScrollView>

            <ChatOverlay roomId={room.id} />

            <View style={styles.controls}>
                {!isConnected && (
                    <Text style={{ color: theme.colors.textSecondary, fontSize: 12, marginBottom: 4 }}>
                        Connecting...
                    </Text>
                )}
                <TouchableOpacity
                    style={[styles.controlButton, isMuted && styles.mutedButton, !isConnected && { opacity: 0.5 }]}
                    onPress={toggleMute}
                    disabled={!isConnected}
                >
                    <Text style={styles.controlText}>{isMuted ? 'Unmute 🎙️' : 'Mute 🔇'}</Text>
                </TouchableOpacity>

                <TouchableOpacity style={styles.controlButton} onPress={() => alert('Raise Hand')}>
                    <Text style={styles.controlText}>✋</Text>
                </TouchableOpacity>
            </View>
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: theme.colors.background,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: theme.spacing.m,
        borderBottomWidth: 1,
        borderBottomColor: theme.colors.border,
    },
    leaveText: {
        color: theme.colors.error,
        fontWeight: 'bold',
        fontSize: 16,
    },
    roomTitle: {
        ...theme.typography.h3,
        flex: 1,
        textAlign: 'center',
        marginHorizontal: theme.spacing.s,
    },
    liveBadge: {
        backgroundColor: theme.colors.error,
        paddingHorizontal: theme.spacing.s,
        paddingVertical: 2,
        borderRadius: 4,
    },
    liveText: {
        color: '#fff',
        fontSize: 10,
        fontWeight: 'bold',
    },
    grid: {
        padding: theme.spacing.l,
    },
    sectionHeader: {
        ...theme.typography.caption,
        marginBottom: theme.spacing.m,
        marginTop: theme.spacing.m,
        textTransform: 'uppercase',
    },
    speakerRow: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: theme.spacing.l,
    },
    listenerRow: {
        flexDirection: 'row',
        flexWrap: 'wrap',
    },
    gridItem: {
        alignItems: 'center',
        marginBottom: theme.spacing.m,
        width: 80,
    },
    avatar: {
        width: 70,
        height: 70,
        borderRadius: 35,
        backgroundColor: theme.colors.surface,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: theme.spacing.s,
    },
    hostBorder: {
        borderWidth: 2,
        borderColor: theme.colors.primary,
    },
    avatarText: {
        fontSize: 24,
        color: theme.colors.text,
    },
    name: {
        color: theme.colors.text,
        fontSize: 12,
        textAlign: 'center',
    },
    controls: {
        flexDirection: 'row',
        justifyContent: 'space-around',
        padding: theme.spacing.l,
        backgroundColor: theme.colors.surface,
        borderTopLeftRadius: theme.borderRadius.l,
        borderTopRightRadius: theme.borderRadius.l,
    },
    controlButton: {
        backgroundColor: theme.colors.background,
        padding: theme.spacing.m,
        borderRadius: 50,
        width: 120,
        alignItems: 'center',
    },
    mutedButton: {
        backgroundColor: theme.colors.primary,
    },
    controlText: {
        color: theme.colors.text,
        fontWeight: 'bold',
    }
});
