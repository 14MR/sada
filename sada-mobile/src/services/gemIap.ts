import { Platform } from 'react-native';
import * as RNIap from 'react-native-iap';
import type { Purchase } from 'react-native-iap';
import * as SecureStore from 'expo-secure-store';
import type { GemPurchaseReceipt } from '../api/gemsCore';

export interface GemPackage {
    id: string;
    gems: number;
    productId: string;
}

export interface GemPurchaseResult {
    receipt: GemPurchaseReceipt;
    purchase: Purchase;
}

const purchaseMatchesProduct = (purchase: Purchase, productId: string) => (
    purchase.productId === productId || purchase.productIds?.includes(productId)
);

const receiptFromPurchase = (purchase: Purchase): GemPurchaseReceipt => {
    if (Platform.OS === 'android') {
        if (!purchase.purchaseToken) {
            throw new Error('Google Play purchase token missing');
        }

        return {
            receiptData: purchase.purchaseToken,
            platform: 'google',
        };
    }

    if (Platform.OS === 'ios') {
        const receiptData = purchase.transactionId || purchase.transactionReceipt;
        if (!receiptData) {
            throw new Error('Apple purchase receipt missing');
        }

        return {
            receiptData,
            platform: 'apple',
        };
    }

    throw new Error('In-app purchases are only available on iOS and Android');
};

const waitForPurchase = async (productId: string, startPurchase: () => Promise<Purchase | Purchase[] | void>) => (
    new Promise<Purchase>((resolve, reject) => {
        let settled = false;
        let updateSubscription: { remove: () => void } | undefined;
        let errorSubscription: { remove: () => void } | undefined;

        const cleanup = () => {
            updateSubscription?.remove();
            errorSubscription?.remove();
        };

        const settle = (callback: () => void) => {
            if (settled) return;
            settled = true;
            cleanup();
            callback();
        };

        updateSubscription = RNIap.purchaseUpdatedListener((purchase) => {
            if (!purchaseMatchesProduct(purchase, productId)) return;
            settle(() => resolve(purchase));
        });

        errorSubscription = RNIap.purchaseErrorListener((error) => {
            settle(() => reject(error));
        });

        startPurchase()
            .then((result) => {
                const purchases = Array.isArray(result) ? result : result ? [result] : [];
                const purchase = purchases.find((candidate) => purchaseMatchesProduct(candidate, productId));
                if (purchase) {
                    settle(() => resolve(purchase));
                }
            })
            .catch((error) => {
                settle(() => reject(error));
            });
    })
);

export const purchaseGemPackage = async (pack: GemPackage): Promise<GemPurchaseResult> => {
    if (Platform.OS !== 'ios' && Platform.OS !== 'android') {
        throw new Error('In-app purchases are only available on iOS and Android');
    }

    await RNIap.initConnection();

    if (Platform.OS === 'android') {
        await RNIap.flushFailedPurchasesCachedAsPendingAndroid();
    }

    const userId = await SecureStore.getItemAsync('user_id');
    const purchase = await waitForPurchase(pack.productId, () => {
        if (Platform.OS === 'android') {
            return RNIap.requestPurchase({
                skus: [pack.productId],
                obfuscatedAccountIdAndroid: userId || undefined,
            });
        }

        return RNIap.requestPurchase({
            sku: pack.productId,
            appAccountToken: userId || undefined,
            andDangerouslyFinishTransactionAutomaticallyIOS: false,
        });
    });

    return {
        receipt: receiptFromPurchase(purchase),
        purchase,
    };
};

export const finishGemPurchase = async ({ purchase }: GemPurchaseResult) => {
    await RNIap.finishTransaction({
        purchase,
        isConsumable: true,
    });
};
