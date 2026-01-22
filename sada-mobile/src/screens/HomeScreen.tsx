import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, RefreshControl, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { theme } from '../theme';
import { AuthService, User } from '../api/auth';
import { RoomService, Room } from '../api/rooms';
import * as SecureStore from 'expo-secure-store';

const RoomCard = ({ room, onPress }: { room: Room; onPress: () => void }) => (
    <TouchableOpacity style={styles.card} onPress={onPress}>
        <View style={styles.cardHeader}>
            <View style={styles.liveBadge}>
                <Text style={styles.liveText}>🔴 LIVE</Text>
            </View>
            <Text style={styles.categoryBadge}>{room.category}</Text>
        </View>
        <Text style={styles.roomTitle}>{room.title}</Text>
        <View style={styles.hostRow}>
            <Text style={styles.hostName}>{room.host.display_name} 💬</Text>
            <Text style={styles.listenerCount}>👥 {room.listener_count}</Text>
        </View>
    </TouchableOpacity>
);

export const HomeScreen = ({ navigation }: any) => {
    const [user, setUser] = useState<User | null>(null);
    const [rooms, setRooms] = useState<Room[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    useEffect(() => {
        loadProfile();
    }, []);

    useFocusEffect(
        useCallback(() => {
            loadRooms();
        }, [])
    );

    const loadProfile = async () => {
        try {
            const userId = await SecureStore.getItemAsync('user_id');
            if (userId) {
                const userData = await AuthService.getCurrentUser(userId);
                setUser(userData);
            }
        } catch (error) {
            console.error('Failed to load profile', error);
        }
    };

    const loadRooms = async () => {
        try {
            const data = await RoomService.getRooms();
            setRooms(data);
        } catch (error) {
            console.error('Failed to load rooms', error);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    const onRefresh = () => {
        setRefreshing(true);
        loadRooms();
    };

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.header}>
                <View style={styles.topRow}>
                    <Text style={styles.greeting}>
                        Welcome, {user?.display_name || 'Guest'}
                    </Text>
                    <TouchableOpacity onPress={() => navigation.navigate('Notifications')}>
                        <Text style={{ fontSize: 24 }}>🔔</Text>
                    </TouchableOpacity>
                </View>
                {user && (
                    <TouchableOpacity onPress={() => navigation.navigate('Gems')}>
                        <Text style={styles.balance}>💎 {user.gem_balance}</Text>
                    </TouchableOpacity>
                )}
            </View>

            <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>Live Rooms</Text>
                <TouchableOpacity onPress={() => navigation.navigate('CreateRoom')}>
                    <Text style={styles.createButton}>+ Create Room</Text>
                </TouchableOpacity>
            </View>

            <FlatList
                data={rooms}
                keyExtractor={(item) => item.id}
                renderItem={({ item }) => (
                    <RoomCard
                        room={item}
                        onPress={() => navigation.navigate('Room', { room: item })}
                    />
                )}
                contentContainerStyle={styles.listContent}
                refreshControl={
                    <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.colors.primary} />
                }
                ListEmptyComponent={
                    !loading ? (
                        <View style={styles.emptyState}>
                            <Text style={styles.emptyText}>No active rooms right now.</Text>
                            <Text style={styles.emptySubText}>Be the first to start one!</Text>
                        </View>
                    ) : null
                }
            />
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: theme.colors.background,
    },
    header: {
        paddingHorizontal: theme.spacing.m,
        paddingTop: theme.spacing.m,
        marginBottom: theme.spacing.l,
    },
    topRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: theme.spacing.s,
    },
    greeting: {
        ...theme.typography.h2,
        color: theme.colors.text,
    },
    balance: {
        ...theme.typography.h3,
        color: theme.colors.warning,
    },
    sectionHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: theme.spacing.m,
        marginBottom: theme.spacing.m,
    },
    sectionTitle: {
        ...theme.typography.h3,
    },
    createButton: {
        color: theme.colors.primary,
        fontWeight: 'bold',
        fontSize: 16,
    },
    listContent: {
        paddingHorizontal: theme.spacing.m,
        paddingBottom: theme.spacing.xl,
    },
    card: {
        backgroundColor: theme.colors.surface,
        padding: theme.spacing.m,
        borderRadius: theme.borderRadius.m,
        marginBottom: theme.spacing.m,
    },
    cardHeader: {
        flexDirection: 'row',
        marginBottom: theme.spacing.s,
    },
    liveBadge: {
        backgroundColor: 'rgba(255, 0, 0, 0.2)',
        paddingHorizontal: theme.spacing.s,
        paddingVertical: 2,
        borderRadius: 4,
        marginRight: theme.spacing.s,
    },
    liveText: {
        color: '#FF5252',
        fontSize: 12,
        fontWeight: 'bold',
    },
    categoryBadge: {
        color: theme.colors.textSecondary,
        fontSize: 12,
        textTransform: 'uppercase',
        marginTop: 2,
    },
    roomTitle: {
        ...theme.typography.h3,
        marginBottom: theme.spacing.s,
    },
    hostRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
    },
    hostName: {
        color: theme.colors.textSecondary,
        fontSize: 14,
    },
    listenerCount: {
        color: theme.colors.text,
        fontWeight: '600',
    },
    emptyState: {
        alignItems: 'center',
        marginTop: theme.spacing.xxl,
    },
    emptyText: {
        ...theme.typography.h3,
        marginBottom: theme.spacing.s,
    },
    emptySubText: {
        color: theme.colors.textSecondary,
    }
});
