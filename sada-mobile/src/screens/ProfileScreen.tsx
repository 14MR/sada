import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Image, TouchableOpacity, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { theme } from '../theme';
import { AuthService, User } from '../api/auth';
import { FollowService } from '../api/follow';
import * as SecureStore from 'expo-secure-store';

export const ProfileScreen = ({ navigation }: any) => {
    const [user, setUser] = useState<User | null>(null);
    const [stats, setStats] = useState({ followers: 0, following: 0 });

    useEffect(() => {
        loadProfile();
    }, []);

    const loadProfile = async () => {
        const userId = await SecureStore.getItemAsync('user_id');
        if (userId) {
            const userData = await AuthService.getCurrentUser(userId);
            setUser(userData);

            // Load Follow Stats
            try {
                const followers = await FollowService.getFollowers(userId);
                const following = await FollowService.getFollowing(userId);
                setStats({
                    followers: followers.length,
                    following: following.length
                });
            } catch (e) {
                console.error("Failed to load follow stats", e);
            }
        }
    };

    const handleSignOut = async () => {
        await AuthService.signOut();
        navigation.reset({
            index: 0,
            routes: [{ name: 'Login' }],
        });
    };

    if (!user) {
        return (
            <SafeAreaView style={styles.container}>
                <Text>Loading...</Text>
            </SafeAreaView>
        );
    }

    return (
        <SafeAreaView style={styles.container}>
            <ScrollView contentContainerStyle={styles.scrollContent}>
                <View style={styles.header}>
                    <View style={styles.avatarPlaceholder}>
                        <Text style={styles.avatarText}>{user.display_name[0]}</Text>
                    </View>
                    <Text style={styles.name}>{user.display_name}</Text>
                    <Text style={styles.username}>@{user.username}</Text>
                    <Text style={styles.bio}>{user.bio || "No bio yet"}</Text>
                </View>

                <View style={styles.statsRow}>
                    <View style={styles.statItem}>
                        <Text style={styles.statValue}>{stats.followers}</Text>
                        <Text style={styles.statLabel}>Followers</Text>
                    </View>
                    <View style={styles.statItem}>
                        <Text style={styles.statValue}>{stats.following}</Text>
                        <Text style={styles.statLabel}>Following</Text>
                    </View>
                    <TouchableOpacity style={styles.statItem} onPress={() => navigation.navigate('Gems')}>
                        <Text style={styles.statValue}>{user.gem_balance}</Text>
                        <Text style={styles.statLabel}>Gems 💎</Text>
                    </TouchableOpacity>
                </View>

                <TouchableOpacity style={styles.menuItem} onPress={() => navigation.navigate('Notifications')}>
                    <Text style={styles.menuText}>🔔 Notifications</Text>
                </TouchableOpacity>

                <TouchableOpacity style={styles.logoutButton} onPress={handleSignOut}>
                    <Text style={styles.logoutText}>Sign Out</Text>
                </TouchableOpacity>
            </ScrollView>
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: theme.colors.background,
    },
    scrollContent: {
        padding: theme.spacing.l,
        alignItems: 'center',
    },
    header: {
        alignItems: 'center',
        marginBottom: theme.spacing.xl,
    },
    avatarPlaceholder: {
        width: 100,
        height: 100,
        borderRadius: 50,
        backgroundColor: theme.colors.surface,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: theme.spacing.m,
        borderWidth: 2,
        borderColor: theme.colors.primary,
    },
    avatarText: {
        fontSize: 32,
        color: theme.colors.text,
        fontWeight: 'bold',
    },
    name: {
        ...theme.typography.h2,
        marginBottom: theme.spacing.xs,
    },
    username: {
        ...theme.typography.body,
        color: theme.colors.textSecondary,
        marginBottom: theme.spacing.m,
    },
    bio: {
        ...theme.typography.body,
        textAlign: 'center',
    },
    statsRow: {
        flexDirection: 'row',
        justifyContent: 'space-around',
        width: '100%',
        marginBottom: theme.spacing.xl,
        backgroundColor: theme.colors.surface,
        padding: theme.spacing.m,
        borderRadius: theme.borderRadius.m,
    },
    statItem: {
        alignItems: 'center',
    },
    statValue: {
        ...theme.typography.h3,
    },
    statLabel: {
        ...theme.typography.caption,
    },
    menuItem: {
        width: '100%',
        padding: theme.spacing.m,
        backgroundColor: theme.colors.surface,
        borderRadius: theme.borderRadius.m,
        marginBottom: theme.spacing.m,
        flexDirection: 'row',
        alignItems: 'center',
    },
    menuText: {
        color: theme.colors.text,
        fontSize: 16,
        fontWeight: '600',
    },
    logoutButton: {
        marginTop: theme.spacing.xl,
        padding: theme.spacing.m,
    },
    logoutText: {
        color: theme.colors.error,
        fontSize: 16,
    },
});
