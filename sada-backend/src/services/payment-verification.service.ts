import crypto from "crypto";

export interface PurchaseVerification {
    valid: boolean;
    transactionId?: string;
}

interface AppleTransactionPayload {
    transactionId?: string;
    originalTransactionId?: string;
    bundleId?: string;
    productId?: string;
    revocationDate?: number;
}

interface GooglePurchasePayload {
    orderId?: string;
    purchaseState?: number;
    consumptionState?: number;
}

const APPLE_PRODUCTION_URL = "https://api.storekit.itunes.apple.com";
const APPLE_SANDBOX_URL = "https://api.storekit-sandbox.itunes.apple.com";
const GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token";
const GOOGLE_PUBLISHER_URL = "https://androidpublisher.googleapis.com/androidpublisher/v3";

function optionalEnv(name: string): string {
    return process.env[name]?.trim() || "";
}

function requiredEnv(name: string): string {
    const value = optionalEnv(name);
    if (!value) throw new Error(`Missing required environment variable: ${name}`);
    return value;
}

function normalizePrivateKey(value: string): string {
    return value.replace(/\\n/g, "\n");
}

function base64Url(input: string | Buffer): string {
    return Buffer.from(input)
        .toString("base64")
        .replace(/=/g, "")
        .replace(/\+/g, "-")
        .replace(/\//g, "_");
}

function decodeBase64UrlJson<T>(value: string): T {
    const padded = value.replace(/-/g, "+").replace(/_/g, "/");
    return JSON.parse(Buffer.from(padded, "base64").toString("utf8")) as T;
}

function createAppleJwt(): string {
    const now = Math.floor(Date.now() / 1000);
    const header = {
        alg: "ES256",
        kid: requiredEnv("APPLE_IAP_KEY_ID"),
        typ: "JWT",
    };
    const payload = {
        iss: requiredEnv("APPLE_IAP_ISSUER_ID"),
        iat: now,
        exp: now + 300,
        aud: "appstoreconnect-v1",
        bid: requiredEnv("APPLE_BUNDLE_ID"),
    };

    const unsigned = `${base64Url(JSON.stringify(header))}.${base64Url(JSON.stringify(payload))}`;
    const signature = crypto.sign("sha256", Buffer.from(unsigned), {
        key: normalizePrivateKey(requiredEnv("APPLE_IAP_PRIVATE_KEY")),
        dsaEncoding: "ieee-p1363",
    });
    return `${unsigned}.${base64Url(signature)}`;
}

function createGoogleServiceAccountJwt(): string {
    const now = Math.floor(Date.now() / 1000);
    const header = { alg: "RS256", typ: "JWT" };
    const payload = {
        iss: requiredEnv("GOOGLE_PLAY_SERVICE_ACCOUNT_EMAIL"),
        scope: "https://www.googleapis.com/auth/androidpublisher",
        aud: GOOGLE_TOKEN_URL,
        iat: now,
        exp: now + 3600,
    };

    const unsigned = `${base64Url(JSON.stringify(header))}.${base64Url(JSON.stringify(payload))}`;
    const signature = crypto.sign("RSA-SHA256", Buffer.from(unsigned), normalizePrivateKey(requiredEnv("GOOGLE_PLAY_PRIVATE_KEY")));
    return `${unsigned}.${base64Url(signature)}`;
}

function transactionIdFromAppleReceipt(receiptData: string): string {
    const trimmed = receiptData.trim();
    if (!trimmed.includes(".")) return trimmed;

    const [, payload] = trimmed.split(".");
    const decoded = decodeBase64UrlJson<AppleTransactionPayload>(payload);
    const transactionId = decoded.transactionId || decoded.originalTransactionId;
    if (!transactionId) throw new Error("Apple receipt is missing transactionId");
    return transactionId;
}

async function fetchJson<T>(url: string, init: RequestInit): Promise<T> {
    const response = await fetch(url, init);
    const body = await response.text();
    const parsed = body ? JSON.parse(body) : {};

    if (!response.ok) {
        throw new Error(`Payment provider request failed: ${response.status}`);
    }

    return parsed as T;
}

async function getGoogleAccessToken(): Promise<string> {
    const assertion = createGoogleServiceAccountJwt();
    const body = new URLSearchParams({
        grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
        assertion,
    });

    const token = await fetchJson<{ access_token?: string }>(GOOGLE_TOKEN_URL, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body,
    });

    if (!token.access_token) throw new Error("Google Play token response missing access_token");
    return token.access_token;
}

export class PaymentVerificationService {
    static receiptHash(receiptData: string): string {
        return crypto.createHash("sha256").update(receiptData).digest("hex");
    }

    static isDuplicateReceiptError(error: unknown): boolean {
        if (!(error instanceof Error)) return false;
        return /duplicate|unique|constraint|SQLITE_CONSTRAINT/i.test(error.message);
    }

    static async verifyApplePurchase(receiptData: string, productId: string): Promise<PurchaseVerification> {
        if (process.env.NODE_ENV === "test") {
            return { valid: true, transactionId: `apple_test_${Date.now()}` };
        }

        const transactionId = transactionIdFromAppleReceipt(receiptData);
        const environment = optionalEnv("APPLE_IAP_ENVIRONMENT") || "production";
        const baseUrl = environment === "sandbox" ? APPLE_SANDBOX_URL : APPLE_PRODUCTION_URL;
        const result = await fetchJson<{ signedTransactionInfo?: string }>(
            `${baseUrl}/inApps/v1/transactions/${encodeURIComponent(transactionId)}`,
            {
                method: "GET",
                headers: { Authorization: `Bearer ${createAppleJwt()}` },
            },
        );

        if (!result.signedTransactionInfo) {
            throw new Error("Apple transaction response missing signedTransactionInfo");
        }

        const [, payload] = result.signedTransactionInfo.split(".");
        const transaction = decodeBase64UrlJson<AppleTransactionPayload>(payload);
        const bundleId = requiredEnv("APPLE_BUNDLE_ID");
        const valid = transaction.bundleId === bundleId &&
            transaction.productId === productId &&
            !transaction.revocationDate;

        return {
            valid,
            transactionId: transaction.transactionId || transactionId,
        };
    }

    static async verifyGooglePurchase(receiptData: string, productId: string): Promise<PurchaseVerification> {
        if (process.env.NODE_ENV === "test") {
            return { valid: true, transactionId: `google_test_${Date.now()}` };
        }

        const packageName = requiredEnv("GOOGLE_PLAY_PACKAGE_NAME");
        const accessToken = await getGoogleAccessToken();
        const url = `${GOOGLE_PUBLISHER_URL}/applications/${encodeURIComponent(packageName)}` +
            `/purchases/products/${encodeURIComponent(productId)}/tokens/${encodeURIComponent(receiptData)}`;
        const purchase = await fetchJson<GooglePurchasePayload>(url, {
            method: "GET",
            headers: { Authorization: `Bearer ${accessToken}` },
        });

        return {
            valid: purchase.purchaseState === 0,
            transactionId: purchase.orderId,
        };
    }
}
