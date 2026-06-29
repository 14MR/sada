/**
 * Gems E2E Tests — Real DB, real service layer
 *
 * Tests gem operations against the actual database,
 * not an in-memory stub.
 */
import request from 'supertest';
import { setupTestDB, clearDatabase, createTestUser, getApp } from './helpers';
import { AppDataSource } from '../../src/config/database';
import { GemTransaction, TransactionType } from '../../src/models/GemTransaction';
import { PaymentReceipt } from '../../src/models/PaymentReceipt';

jest.mock('../../src/config/database', () => require('./testDb'));

jest.mock('../../src/services/audio.service', () => ({
  AudioService: {
    createSession: jest.fn().mockResolvedValue({
      provider: 'test', sessionId: 'test-session', iceServers: [],
      connectionDetails: { websocketUrl: 'ws://test', token: 'mock' },
    }),
    generateToken: jest.fn().mockResolvedValue({
      iceServers: [],
      connectionDetails: { websocketUrl: 'ws://test', token: 'mock-token' },
    }),
  },
}));

jest.mock('../../src/services/chat.service', () => ({
  ChatService: {
    getInstance: jest.fn().mockReturnValue({ sendToUser: jest.fn() }),
    initialize: jest.fn(),
  },
}));

describe('Gems E2E', () => {
  beforeAll(async () => {
    await setupTestDB();
  });

  beforeEach(async () => {
    await clearDatabase();
  });

  describe('GET /gems/balance/:userId', () => {
    it('should return user balance', async () => {
      const user = await createTestUser({ username: 'gem_bal', gem_balance: 250 });

      const response = await request(getApp())
        .get(`/api/gems/balance/${user.user.id}`)
        .set('Authorization', `Bearer ${user.token}`);

      expect(response.status).toBe(200);
      expect(response.body.balance).toBe(250);
    });

    it('should require authentication', async () => {
      const user = await createTestUser({ username: 'gem_noauth' });

      const response = await request(getApp())
        .get(`/api/gems/balance/${user.user.id}`);

      expect(response.status).toBe(401);
    });
  });

  describe('POST /gems/gift', () => {
    it('should transfer gems from sender to receiver', async () => {
      const sender = await createTestUser({ username: 'gem_sender', gem_balance: 100 });
      const receiver = await createTestUser({ username: 'gem_receiver', gem_balance: 50 });

      const response = await request(getApp())
        .post('/api/gems/gift')
        .set('Authorization', `Bearer ${sender.token}`)
        .send({ receiverId: receiver.user.id, amount: 25 });

      expect(response.status).toBe(200);

      // Verify balances changed
      const senderBal = await request(getApp())
        .get(`/api/gems/balance/${sender.user.id}`)
        .set('Authorization', `Bearer ${sender.token}`);
      expect(senderBal.body.balance).toBe(75);

      const receiverBal = await request(getApp())
        .get(`/api/gems/balance/${receiver.user.id}`)
        .set('Authorization', `Bearer ${receiver.token}`);
      expect(receiverBal.body.balance).toBe(75);
    });

    it('should fail with insufficient balance', async () => {
      const sender = await createTestUser({ username: 'gem_poor', gem_balance: 10 });
      const receiver = await createTestUser({ username: 'gem_rich', gem_balance: 1000 });

      const response = await request(getApp())
        .post('/api/gems/gift')
        .set('Authorization', `Bearer ${sender.token}`)
        .send({ receiverId: receiver.user.id, amount: 100 });

      expect(response.status).toBe(400);
      expect(response.body.error).toContain('Insufficient');
    });

    it('should prevent gifting to self', async () => {
      const user = await createTestUser({ username: 'gem_self', gem_balance: 100 });

      const response = await request(getApp())
        .post('/api/gems/gift')
        .set('Authorization', `Bearer ${user.token}`)
        .send({ receiverId: user.user.id, amount: 10 });

      expect(response.status).toBe(400);
    });

    it('should require authentication', async () => {
      const receiver = await createTestUser({ username: 'gem_gift_noauth' });

      const response = await request(getApp())
        .post('/api/gems/gift')
        .send({ receiverId: receiver.user.id, amount: 10 });

      expect(response.status).toBe(401);
    });

    it('should handle concurrent gift requests atomically', async () => {
      const sender = await createTestUser({ username: 'gem_concurrent', gem_balance: 100 });
      const receiver = await createTestUser({ username: 'gem_conc_recv', gem_balance: 0 });

      // Send two concurrent gifts that together exceed balance
      const requests = [
        request(getApp())
          .post('/api/gems/gift')
          .set('Authorization', `Bearer ${sender.token}`)
          .send({ receiverId: receiver.user.id, amount: 75 }),
        request(getApp())
          .post('/api/gems/gift')
          .set('Authorization', `Bearer ${sender.token}`)
          .send({ receiverId: receiver.user.id, amount: 75 }),
      ];

      const responses = await Promise.all(requests);
      const successCount = responses.filter(r => r.status === 200).length;
      const failCount = responses.filter(r => r.status === 400).length;

      // Exactly one should succeed, one should fail
      expect(successCount).toBe(1);
      expect(failCount).toBe(1);

      // Total gems should be preserved
      const senderBal = await request(getApp())
        .get(`/api/gems/balance/${sender.user.id}`)
        .set('Authorization', `Bearer ${sender.token}`);
      const receiverBal = await request(getApp())
        .get(`/api/gems/balance/${receiver.user.id}`)
        .set('Authorization', `Bearer ${receiver.token}`);

      expect(senderBal.body.balance + receiverBal.body.balance).toBe(100);
    });
  });

  describe('GET /gems/history/:userId', () => {
    async function createGiftTransaction(
      sender: Awaited<ReturnType<typeof createTestUser>>,
      receiver: Awaited<ReturnType<typeof createTestUser>>,
      amount: number,
      created_at: Date,
    ): Promise<GemTransaction> {
      const repo = AppDataSource.getRepository(GemTransaction);
      const transaction = repo.create({
        sender: sender.user,
        receiver: receiver.user,
        amount,
        type: TransactionType.GIFT,
        created_at,
      });
      return await repo.save(transaction);
    }

    it('should return paginated history with public user fields only', async () => {
      const sender = await createTestUser({
        username: 'gem_history_sender',
        display_name: 'History Sender',
        gem_balance: 100,
      });
      const receiver = await createTestUser({
        username: 'gem_history_receiver',
        display_name: 'History Receiver',
        gem_balance: 0,
      });

      await createGiftTransaction(sender, receiver, 10, new Date('2026-06-29T10:00:00.000Z'));
      await createGiftTransaction(sender, receiver, 15, new Date('2026-06-29T10:01:00.000Z'));

      const response = await request(getApp())
        .get(`/api/gems/history/${sender.user.id}?limit=1`)
        .set('Authorization', `Bearer ${sender.token}`);

      expect(response.status).toBe(200);
      expect(response.body).toHaveLength(1);
      expect(response.body[0]).toMatchObject({
        amount: expect.any(Number),
        type: 'gift',
        sender: {
          id: sender.user.id,
          username: 'gem_history_sender',
          display_name: 'History Sender',
        },
        receiver: {
          id: receiver.user.id,
          username: 'gem_history_receiver',
          display_name: 'History Receiver',
        },
      });
      expect(Object.keys(response.body[0].sender).sort()).toEqual([
        'avatar_url',
        'display_name',
        'id',
        'username',
      ]);
      expect(Object.keys(response.body[0].receiver).sort()).toEqual([
        'avatar_url',
        'display_name',
        'id',
        'username',
      ]);
      expect(response.body[0].sender.apple_id).toBeUndefined();
      expect(response.body[0].receiver.gem_balance).toBeUndefined();
      expect(response.body[0].receiver.banned).toBeUndefined();
    });

    it('should apply offset when paging gem history', async () => {
      const sender = await createTestUser({ username: 'gem_history_page_sender', gem_balance: 100 });
      const receiver = await createTestUser({ username: 'gem_history_page_receiver', gem_balance: 0 });

      await createGiftTransaction(sender, receiver, 5, new Date('2026-06-29T10:00:00.000Z'));
      await createGiftTransaction(sender, receiver, 10, new Date('2026-06-29T10:01:00.000Z'));
      await createGiftTransaction(sender, receiver, 15, new Date('2026-06-29T10:02:00.000Z'));

      const firstPage = await request(getApp())
        .get(`/api/gems/history/${sender.user.id}?limit=1`)
        .set('Authorization', `Bearer ${sender.token}`);
      const secondPage = await request(getApp())
        .get(`/api/gems/history/${sender.user.id}?limit=1&offset=1`)
        .set('Authorization', `Bearer ${sender.token}`);

      expect(firstPage.status).toBe(200);
      expect(secondPage.status).toBe(200);
      expect(firstPage.body).toHaveLength(1);
      expect(secondPage.body).toHaveLength(1);
      expect(secondPage.body[0].id).not.toBe(firstPage.body[0].id);
    });
  });

  describe('POST /gems/purchase', () => {
    it('should persist receipt claims for purchase idempotency', async () => {
      const buyer = await createTestUser({ username: 'gem_buyer', gem_balance: 0 });

      const response = await request(getApp())
        .post('/api/gems/purchase')
        .set('Authorization', `Bearer ${buyer.token}`)
        .send({ amount: 100, receiptData: 'apple-receipt-1', platform: 'apple' });

      expect(response.status).toBe(200);

      const receipts = await AppDataSource.getRepository(PaymentReceipt).find();
      expect(receipts).toHaveLength(1);
      expect(receipts[0].amount).toBe(100);
      expect(receipts[0].platform).toBe('apple');
      expect(receipts[0].gem_transaction_id).toBe(response.body.id);

      const balance = await request(getApp())
        .get(`/api/gems/balance/${buyer.user.id}`)
        .set('Authorization', `Bearer ${buyer.token}`);
      expect(balance.body.balance).toBe(100);
    });

    it('should reject duplicate purchase receipts from the database', async () => {
      const buyer = await createTestUser({ username: 'gem_dup_buyer', gem_balance: 0 });
      const payload = { amount: 50, receiptData: 'duplicate-apple-receipt', platform: 'apple' };

      const first = await request(getApp())
        .post('/api/gems/purchase')
        .set('Authorization', `Bearer ${buyer.token}`)
        .send(payload);

      const duplicate = await request(getApp())
        .post('/api/gems/purchase')
        .set('Authorization', `Bearer ${buyer.token}`)
        .send(payload);

      expect(first.status).toBe(200);
      expect(duplicate.status).toBe(409);

      const balance = await request(getApp())
        .get(`/api/gems/balance/${buyer.user.id}`)
        .set('Authorization', `Bearer ${buyer.token}`);
      expect(balance.body.balance).toBe(50);
    });
  });
});
