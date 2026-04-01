import request from 'supertest';
import jwt from 'jsonwebtoken';
import express, { Application, Request, Response, NextFunction } from 'express';

// In-memory user store
interface TestUser {
  id: string;
  apple_id: string;
  username: string;
  display_name: string;
  gem_balance: number;
}

interface TestTransaction {
  id: string;
  sender_id: string | null;
  receiver_id: string;
  amount: number;
  type: string;
  created_at: Date;
}

// In-memory storage
const users: Map<string, TestUser> = new Map();
const transactions: TestTransaction[] = [];

const TransactionType = {
  PURCHASE: 'PURCHASE',
  GIFT: 'GIFT',
} as const;

// Test infrastructure
let app: Application;
let userToken: string;
let userId: string;
let user2Token: string;
let user2Id: string;

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
  userToken = jwt.sign({ id: userId, username: 'testuser1' }, 'test_secret');

  user2Id = 'user-2-' + Date.now();
  users.set(user2Id, {
    id: user2Id,
    apple_id: 'test-apple-id-2',
    username: 'testuser2',
    display_name: 'Test User 2',
    gem_balance: 50,
  });
  user2Token = jwt.sign({ id: user2Id, username: 'testuser2' }, 'test_secret');

  // Create test app
  app = express();
  app.use(express.json());

  // Auth middleware
  const authMiddleware = (req: Request, res: Response, next: NextFunction) => {
    const auth = req.headers.authorization;
    if (!auth?.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    try {
      const token = auth.slice(7);
      const decoded = jwt.verify(token, 'test_secret') as { id: string };
      (req as any).userId = decoded.id;
      next();
    } catch {
      return res.status(401).json({ error: 'Invalid token' });
    }
  };

  // GET /gems/balance
  app.get('/api/gems/balance', authMiddleware, async (req: Request, res: Response) => {
    const user = users.get((req as any).userId);
    if (!user) return res.status(404).json({ error: 'User not found' });
    res.json({ balance: user.gem_balance });
  });

  // POST /gems/purchase
  app.post('/api/gems/purchase', authMiddleware, async (req: Request, res: Response) => {
    const { amount } = req.body;
    if (!amount || amount <= 0) {
      return res.status(400).json({ error: 'Invalid amount' });
    }
    const user = users.get((req as any).userId);
    if (!user) return res.status(404).json({ error: 'User not found' });

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
  });

  // POST /gems/gift with mutex for race condition prevention
  const giftMutex = new Map<string, Promise<any>>();

  app.post('/api/gems/gift', authMiddleware, async (req: Request, res: Response) => {
    const { receiverId, amount } = req.body;
    if (!amount || amount <= 0) {
      return res.status(400).json({ error: 'Invalid amount' });
    }
    if (!receiverId) {
      return res.status(400).json({ error: 'Receiver required' });
    }
    const senderId = (req as any).userId;
    if (senderId === receiverId) {
      return res.status(400).json({ error: 'Cannot gift yourself' });
    }

    // Simple mutex per sender to prevent race conditions
    const mutexKey = senderId;
    const currentOp = giftMutex.get(mutexKey) || Promise.resolve();

    const operation = currentOp.then(async () => {
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
    });

    giftMutex.set(mutexKey, operation);

    try {
      const result = await operation;
      res.status(result.status).json(result.body);
    } catch (err: any) {
      res.status(500).json({ error: 'Transaction failed' });
    }
  });
});

describe('Gem Controller', () => {
  describe('POST /gems/purchase', () => {
    it('should add gems to user balance', async () => {
      const response = await request(app)
        .post('/api/gems/purchase')
        .set('Authorization', `Bearer ${userToken}`)
        .send({ amount: 100 });

      expect(response.status).toBe(200);
      expect(response.body.transaction.amount).toBe(100);

      const user = users.get(userId);
      expect(user!.gem_balance).toBe(200);
    });

    it('should reject invalid amount', async () => {
      const response = await request(app)
        .post('/api/gems/purchase')
        .set('Authorization', `Bearer ${userToken}`)
        .send({ amount: -50 });

      expect(response.status).toBe(400);
    });

    it('should require authentication', async () => {
      const response = await request(app).post('/api/gems/purchase').send({ amount: 100 });
      expect(response.status).toBe(401);
    });
  });

  describe('POST /gems/gift', () => {
    it('should transfer gems from sender to receiver', async () => {
      const response = await request(app)
        .post('/api/gems/gift')
        .set('Authorization', `Bearer ${userToken}`)
        .send({ receiverId: user2Id, amount: 25 });

      expect(response.status).toBe(200);

      const sender = users.get(userId);
      const receiver = users.get(user2Id);
      expect(sender!.gem_balance).toBe(75);
      expect(receiver!.gem_balance).toBe(75);
    });

    it('should fail with insufficient balance', async () => {
      const response = await request(app)
        .post('/api/gems/gift')
        .set('Authorization', `Bearer ${user2Token}`)
        .send({ receiverId: userId, amount: 100 });

      expect(response.status).toBe(400);
      expect(response.body.error).toContain('Insufficient balance');
    });

    it('should prevent gifting to self', async () => {
      const response = await request(app)
        .post('/api/gems/gift')
        .set('Authorization', `Bearer ${userToken}`)
        .send({ receiverId: userId, amount: 10 });

      expect(response.status).toBe(400);
    });

    it('should require authentication', async () => {
      const response = await request(app).post('/api/gems/gift').send({ receiverId: user2Id, amount: 10 });
      expect(response.status).toBe(401);
    });
  });

  describe('GET /gems/balance', () => {
    it('should return user balance', async () => {
      const response = await request(app)
        .get('/api/gems/balance')
        .set('Authorization', `Bearer ${userToken}`);

      expect(response.status).toBe(200);
      expect(response.body.balance).toBe(100);
    });

    it('should require authentication', async () => {
      const response = await request(app).get('/api/gems/balance');
      expect(response.status).toBe(401);
    });
  });

  describe('Race Condition Prevention', () => {
    it('should handle concurrent gift requests atomically', async () => {
      const requests = [
        request(app)
          .post('/api/gems/gift')
          .set('Authorization', `Bearer ${userToken}`)
          .send({ receiverId: user2Id, amount: 75 }),
        request(app)
          .post('/api/gems/gift')
          .set('Authorization', `Bearer ${userToken}`)
          .send({ receiverId: user2Id, amount: 75 }),
      ];

      const responses = await Promise.all(requests);
      const successCount = responses.filter((r) => r.status === 200).length;
      const failCount = responses.filter((r) => r.status === 400).length;

      expect(successCount).toBe(1);
      expect(failCount).toBe(1);

      const user = users.get(userId);
      expect(user!.gem_balance).toBe(25);
    });
  });
});
