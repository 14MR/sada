import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { theme } from '../theme';
import { NotificationService, Notification } from '../api/notifications';

export const NotificationsScreen = ({ navigation }: any) => {
    const [notifications, setNotifications] = useState<Notification[]>([]);

    useEffect(() => {
        loadNotifications();
    }, []);

    const loadNotifications = async () => {
        try {
            const data = await NotificationService.getNotifications();
            setNotifications(data);
        } catch (e) {
            console.error(e);
        }
    };

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()}>
                    <Text style={styles.backText}>Back</Text>
                </TouchableOpacity>
                <Text style={styles.title}>Notifications</Text>
                <View style={{ width: 40 }} />
            </View>

            <FlatList
                data={notifications}
                keyExtractor={(item) => item.id}
                renderItem={({ item }) => (
                    <View style={[styles.item, !item.read && styles.unreadItem]}>
                        <Text style={styles.itemTitle}>{item.title}</Text>
                        <Text style={styles.itemBody}>{item.body}</Text>
                        <Text style={styles.itemDate}>{new Date(item.created_at).toLocaleDateString()}</Text>
                    </View>
                )}
                contentContainerStyle={styles.list}
                ListEmptyComponent={
                    <Text style={styles.emptyText}>No notifications yet.</Text>
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
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: theme.spacing.m,
        borderBottomWidth: 1,
        borderBottomColor: theme.colors.border,
    },
    backText: {
        color: theme.colors.primary,
        fontSize: 16,
    },
    title: {
        ...theme.typography.h2,
    },
    list: {
        padding: theme.spacing.m,
    },
    item: {
        backgroundColor: theme.colors.surface,
        padding: theme.spacing.m,
        borderRadius: theme.borderRadius.m,
        marginBottom: theme.spacing.s,
    },
    unreadItem: {
        borderLeftWidth: 4,
        borderLeftColor: theme.colors.primary,
    },
    itemTitle: {
        ...theme.typography.h3,
        marginBottom: 4,
    },
    itemBody: {
        color: theme.colors.textSecondary,
        marginBottom: 8,
    },
    itemDate: {
        ...theme.typography.caption,
    },
    emptyText: {
        color: theme.colors.textSecondary,
        textAlign: 'center',
        marginTop: theme.spacing.xl,
    },
});
