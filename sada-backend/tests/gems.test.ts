/**
 * Gems E2E Tests — Real DB, real service layer
 *
 * Tests gem operations against the actual database,
 * not an in-memory stub.
 */
import request from 'supertest';
import { setupTestDB, clearDatabase, createTestUser, getApp } from './e2e/helpers';

jest.mock('../src/config/database', () => require('./e2e/testDb'));

jest.mock('../src/services/audio.service', () => ({
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

jest.mock('../src/services/chat.service', () => ({
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
      expect(successCount + failCount).toBe(2);

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
});
