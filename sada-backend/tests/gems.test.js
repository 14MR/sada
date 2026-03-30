"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const supertest_1 = __importDefault(require("supertest"));
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const express_1 = __importDefault(require("express"));
// In-memory storage
const users = new Map();
const transactions = [];
const TransactionType = {
    PURCHASE: 'PURCHASE',
    GIFT: 'GIFT',
};
// Test infrastructure
let app;
let userToken;
let userId;
let user2Token;
let user2Id;
beforeEach(() => {
    users.clear();
    transactions.length = 0;
    // Create test users
    userId = 'user-1-' + Date.now();
    users.set(userId, {
        id: userId,
        apple_id: 'test-apple-id-1',
        username: 'testuser1',
        display_name: 'Test User 1',
        gem_balance: 100,
    });
    userToken = jsonwebtoken_1.default.sign({ id: userId, username: 'testuser1' }, 'test_secret');
    user2Id = 'user-2-' + Date.now();
    users.set(user2Id, {
        id: user2Id,
        apple_id: 'test-apple-id-2',
        username: 'testuser2',
        display_name: 'Test User 2',
        gem_balance: 50,
    });
    user2Token = jsonwebtoken_1.default.sign({ id: user2Id, username: 'testuser2' }, 'test_secret');
    // Create test app
    app = (0, express_1.default)();
    app.use(express_1.default.json());
    // Auth middleware
    const authMiddleware = (req, res, next) => {
        const auth = req.headers.authorization;
        if (!(auth === null || auth === void 0 ? void 0 : auth.startsWith('Bearer '))) {
            return res.status(401).json({ error: 'Unauthorized' });
        }
        try {
            const token = auth.slice(7);
            const decoded = jsonwebtoken_1.default.verify(token, 'test_secret');
            req.userId = decoded.id;
            next();
        }
        catch (_a) {
            return res.status(401).json({ error: 'Invalid token' });
        }
    };
    // GET /gems/balance
    app.get('/gems/balance', authMiddleware, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
        const user = users.get(req.userId);
        if (!user)
            return res.status(404).json({ error: 'User not found' });
        res.json({ balance: user.gem_balance });
    }));
    // POST /gems/purchase
    app.post('/gems/purchase', authMiddleware, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
        const { amount } = req.body;
        if (!amount || amount <= 0) {
            return res.status(400).json({ error: 'Invalid amount' });
        }
        const user = users.get(req.userId);
        if (!user)
            return res.status(404).json({ error: 'User not found' });
        user.gem_balance += amount;
        transactions.push({
            id: 'tx-' + Date.now(),
            sender_id: null,
            receiver_id: user.id,
            amount,
            type: TransactionType.PURCHASE,
            created_at: new Date(),
        });
        res.json({ transaction: { amount, type: TransactionType.PURCHASE } });
    }));
    // POST /gems/gift with mutex for race condition prevention
    const giftMutex = new Map();
    app.post('/gems/gift', authMiddleware, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
        const { receiverId, amount } = req.body;
        if (!amount || amount <= 0) {
            return res.status(400).json({ error: 'Invalid amount' });
        }
        if (!receiverId) {
            return res.status(400).json({ error: 'Receiver required' });
        }
        const senderId = req.userId;
        if (senderId === receiverId) {
            return res.status(400).json({ error: 'Cannot gift yourself' });
        }
        // Simple mutex per sender to prevent race conditions
        const mutexKey = senderId;
        const currentOp = giftMutex.get(mutexKey) || Promise.resolve();
        const operation = currentOp.then(() => __awaiter(void 0, void 0, void 0, function* () {
            const sender = users.get(senderId);
            const receiver = users.get(receiverId);
            if (!sender || !receiver) {
                return { status: 404, body: { error: 'User not found' } };
            }
            if (sender.gem_balance < amount) {
                return { status: 400, body: { error: 'Insufficient balance' } };
            }
            sender.gem_balance -= amount;
            receiver.gem_balance += amount;
            transactions.push({
                id: 'tx-' + Date.now() + '-' + Math.random(),
                sender_id: sender.id,
                receiver_id: receiver.id,
                amount,
                type: TransactionType.GIFT,
                created_at: new Date(),
            });
            return { status: 200, body: { transaction: { amount, type: TransactionType.GIFT } } };
        }));
        giftMutex.set(mutexKey, operation);
        try {
            const result = yield operation;
            res.status(result.status).json(result.body);
        }
        catch (err) {
            res.status(500).json({ error: 'Transaction failed' });
        }
    }));
});
describe('Gem Controller', () => {
    describe('POST /gems/purchase', () => {
        it('should add gems to user balance', () => __awaiter(void 0, void 0, void 0, function* () {
            const response = yield (0, supertest_1.default)(app)
                .post('/gems/purchase')
                .set('Authorization', `Bearer ${userToken}`)
                .send({ amount: 100 });
            expect(response.status).toBe(200);
            expect(response.body.transaction.amount).toBe(100);
            const user = users.get(userId);
            expect(user.gem_balance).toBe(200);
        }));
        it('should reject invalid amount', () => __awaiter(void 0, void 0, void 0, function* () {
            const response = yield (0, supertest_1.default)(app)
                .post('/gems/purchase')
                .set('Authorization', `Bearer ${userToken}`)
                .send({ amount: -50 });
            expect(response.status).toBe(400);
        }));
        it('should require authentication', () => __awaiter(void 0, void 0, void 0, function* () {
            const response = yield (0, supertest_1.default)(app).post('/gems/purchase').send({ amount: 100 });
            expect(response.status).toBe(401);
        }));
    });
    describe('POST /gems/gift', () => {
        it('should transfer gems from sender to receiver', () => __awaiter(void 0, void 0, void 0, function* () {
            const response = yield (0, supertest_1.default)(app)
                .post('/gems/gift')
                .set('Authorization', `Bearer ${userToken}`)
                .send({ receiverId: user2Id, amount: 25 });
            expect(response.status).toBe(200);
            const sender = users.get(userId);
            const receiver = users.get(user2Id);
            expect(sender.gem_balance).toBe(75);
            expect(receiver.gem_balance).toBe(75);
        }));
        it('should fail with insufficient balance', () => __awaiter(void 0, void 0, void 0, function* () {
            const response = yield (0, supertest_1.default)(app)
                .post('/gems/gift')
                .set('Authorization', `Bearer ${user2Token}`)
                .send({ receiverId: userId, amount: 100 });
            expect(response.status).toBe(400);
            expect(response.body.error).toContain('Insufficient balance');
        }));
        it('should prevent gifting to self', () => __awaiter(void 0, void 0, void 0, function* () {
            const response = yield (0, supertest_1.default)(app)
                .post('/gems/gift')
                .set('Authorization', `Bearer ${userToken}`)
                .send({ receiverId: userId, amount: 10 });
            expect(response.status).toBe(400);
        }));
        it('should require authentication', () => __awaiter(void 0, void 0, void 0, function* () {
            const response = yield (0, supertest_1.default)(app).post('/gems/gift').send({ receiverId: user2Id, amount: 10 });
            expect(response.status).toBe(401);
        }));
    });
    describe('GET /gems/balance', () => {
        it('should return user balance', () => __awaiter(void 0, void 0, void 0, function* () {
            const response = yield (0, supertest_1.default)(app)
                .get('/gems/balance')
                .set('Authorization', `Bearer ${userToken}`);
            expect(response.status).toBe(200);
            expect(response.body.balance).toBe(100);
        }));
        it('should require authentication', () => __awaiter(void 0, void 0, void 0, function* () {
            const response = yield (0, supertest_1.default)(app).get('/gems/balance');
            expect(response.status).toBe(401);
        }));
    });
    describe('Race Condition Prevention', () => {
        it('should handle concurrent gift requests atomically', () => __awaiter(void 0, void 0, void 0, function* () {
            const requests = [
                (0, supertest_1.default)(app)
                    .post('/gems/gift')
                    .set('Authorization', `Bearer ${userToken}`)
                    .send({ receiverId: user2Id, amount: 75 }),
                (0, supertest_1.default)(app)
                    .post('/gems/gift')
                    .set('Authorization', `Bearer ${userToken}`)
                    .send({ receiverId: user2Id, amount: 75 }),
            ];
            const responses = yield Promise.all(requests);
            const successCount = responses.filter((r) => r.status === 200).length;
            const failCount = responses.filter((r) => r.status === 400).length;
            expect(successCount).toBe(1);
            expect(failCount).toBe(1);
            const user = users.get(userId);
            expect(user.gem_balance).toBe(25);
        }));
    });
});
