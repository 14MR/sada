import crypto from "crypto";
import { PaymentVerificationService } from "../../src/services/payment-verification.service";

function jwsPayload(payload: unknown): string {
  const encoded = Buffer.from(JSON.stringify(payload))
    .toString("base64")
    .replace(/=/g, "")
    .replace(/\+/g, "-")
    .replace(/\//g, "_");
  return `header.${encoded}.signature`;
}

function setAppleEnv() {
  const { privateKey } = crypto.generateKeyPairSync("ec", { namedCurve: "prime256v1" });
  process.env.APPLE_BUNDLE_ID = "com.sada.app";
  process.env.APPLE_IAP_KEY_ID = "apple-key-id";
  process.env.APPLE_IAP_ISSUER_ID = "apple-issuer-id";
  process.env.APPLE_IAP_PRIVATE_KEY = privateKey.export({ type: "pkcs8", format: "pem" }).toString();
}

function setGoogleEnv() {
  const { privateKey } = crypto.generateKeyPairSync("rsa", { modulusLength: 2048 });
  process.env.GOOGLE_PLAY_PACKAGE_NAME = "com.sada.app";
  process.env.GOOGLE_PLAY_SERVICE_ACCOUNT_EMAIL = "iap@sada.iam.gserviceaccount.com";
  process.env.GOOGLE_PLAY_PRIVATE_KEY = privateKey.export({ type: "pkcs8", format: "pem" }).toString();
}

describe("PaymentVerificationService", () => {
  const originalEnv = { ...process.env };
  const originalFetch = global.fetch;

  beforeEach(() => {
    jest.restoreAllMocks();
    process.env = { ...originalEnv, NODE_ENV: "production" };
  });

  afterAll(() => {
    process.env = originalEnv;
    global.fetch = originalFetch;
  });

  it("verifies an Apple transaction through App Store Server API", async () => {
    setAppleEnv();
    process.env.APPLE_IAP_ENVIRONMENT = "sandbox";
    const signedTransactionInfo = jwsPayload({
      transactionId: "apple-transaction-1",
      bundleId: "com.sada.app",
      productId: "gems_100",
    });
    const fetchMock = jest.fn().mockResolvedValue({
      ok: true,
      text: async () => JSON.stringify({ signedTransactionInfo }),
    });
    global.fetch = fetchMock as unknown as typeof fetch;

    const result = await PaymentVerificationService.verifyApplePurchase("apple-transaction-1", "gems_100");

    expect(result).toEqual({ valid: true, transactionId: "apple-transaction-1" });
    expect(fetchMock).toHaveBeenCalledWith(
      "https://api.storekit-sandbox.itunes.apple.com/inApps/v1/transactions/apple-transaction-1",
      expect.objectContaining({
        method: "GET",
        headers: expect.objectContaining({
          Authorization: expect.stringMatching(/^Bearer /),
        }),
      }),
    );
  });

  it("rejects Apple transactions for the wrong product", async () => {
    setAppleEnv();
    const fetchMock = jest.fn().mockResolvedValue({
      ok: true,
      text: async () => JSON.stringify({
        signedTransactionInfo: jwsPayload({
          transactionId: "apple-transaction-2",
          bundleId: "com.sada.app",
          productId: "gems_550",
        }),
      }),
    });
    global.fetch = fetchMock as unknown as typeof fetch;

    const result = await PaymentVerificationService.verifyApplePurchase("apple-transaction-2", "gems_100");

    expect(result).toEqual({ valid: false, transactionId: "apple-transaction-2" });
  });

  it("verifies a Google Play product purchase", async () => {
    setGoogleEnv();
    const fetchMock = jest
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        text: async () => JSON.stringify({ access_token: "google-access-token" }),
      })
      .mockResolvedValueOnce({
        ok: true,
        text: async () => JSON.stringify({ purchaseState: 0, orderId: "GPA.1234" }),
      });
    global.fetch = fetchMock as unknown as typeof fetch;

    const result = await PaymentVerificationService.verifyGooglePurchase("purchase-token", "gems_550");

    expect(result).toEqual({ valid: true, transactionId: "GPA.1234" });
    expect(fetchMock).toHaveBeenNthCalledWith(
      1,
      "https://oauth2.googleapis.com/token",
      expect.objectContaining({ method: "POST" }),
    );
    expect(fetchMock).toHaveBeenNthCalledWith(
      2,
      "https://androidpublisher.googleapis.com/androidpublisher/v3/applications/com.sada.app/purchases/products/gems_550/tokens/purchase-token",
      expect.objectContaining({
        method: "GET",
        headers: { Authorization: "Bearer google-access-token" },
      }),
    );
  });

  it("fails fast when Google Play credentials are missing", async () => {
    delete process.env.GOOGLE_PLAY_SERVICE_ACCOUNT_EMAIL;
    delete process.env.GOOGLE_PLAY_PRIVATE_KEY;
    delete process.env.GOOGLE_PLAY_PACKAGE_NAME;

    await expect(PaymentVerificationService.verifyGooglePurchase("purchase-token", "gems_100"))
      .rejects.toThrow("Missing required environment variable: GOOGLE_PLAY_PACKAGE_NAME");
  });
});
