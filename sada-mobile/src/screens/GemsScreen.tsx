import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { theme } from '../theme';
import { GemService } from '../api/gems';

const PACKAGES = [
    { id: 'pack_small', gems: 100, price: '$0.99' },
    { id: 'pack_medium', gems: 550, price: '$4.99' },
    { id: 'pack_large', gems: 1200, price: '$9.99' },
];

export const GemsScreen = ({ navigation }: any) => {
    const [loading, setLoading] = useState(false);

    const handlePurchase = async (pack: typeof PACKAGES[0]) => {
        setLoading(true);
        try {
            await GemService.purchaseGems(pack.id);
            Alert.alert('Success', `You purchased ${pack.gems} Gems! 💎`);
            navigation.goBack();
        } catch (error) {
            console.error(error);
            Alert.alert('Error', 'Purchase failed');
        } finally {
            setLoading(false);
        }
    };

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()}>
                    <Text style={styles.closeText}>Close</Text>
                </TouchableOpacity>
                <Text style={styles.title}>Gem Store 💎</Text>
                <View style={{ width: 40 }} />
            </View>

            <ScrollView contentContainerStyle={styles.content}>
                <Text style={styles.subtitle}>Support your favorite creators.</Text>

                {PACKAGES.map((pack) => (
                    <TouchableOpacity
                        key={pack.id}
                        style={styles.card}
                        onPress={() => handlePurchase(pack)}
                        disabled={loading}
                    >
                        <View>
                            <Text style={styles.gemAmount}>{pack.gems} Gems</Text>
                        </View>
                        <View style={styles.priceButton}>
                            <Text style={styles.priceText}>{pack.price}</Text>
                        </View>
                    </TouchableOpacity>
                ))}
            </ScrollView>
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
    },
    closeText: {
        color: theme.colors.textSecondary,
        fontSize: 16,
    },
    title: {
        ...theme.typography.h2,
    },
    content: {
        padding: theme.spacing.m,
    },
    subtitle: {
        color: theme.colors.textSecondary,
        textAlign: 'center',
        marginBottom: theme.spacing.xl,
    },
    card: {
        backgroundColor: theme.colors.surface,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: theme.spacing.l,
        borderRadius: theme.borderRadius.m,
        marginBottom: theme.spacing.m,
    },
    gemAmount: {
        ...theme.typography.h3,
        color: theme.colors.warning,
    },
    priceButton: {
        backgroundColor: theme.colors.primary,
        paddingVertical: theme.spacing.s,
        paddingHorizontal: theme.spacing.m,
        borderRadius: theme.borderRadius.s,
    },
    priceText: {
        color: '#fff',
        fontWeight: 'bold',
    },
});
