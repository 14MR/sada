import request from 'supertest';
import { setupTestDB, clearDatabase, createTestUser, createTestCategory, createTestRoom, getApp } from './helpers';
import { AppDataSource } from '../../src/config/database';
import { GemTransaction, TransactionType } from '../../src/models/GemTransaction';

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

describe('Creator E2E', () => {
  beforeAll(async () => {
    await setupTestDB();
  });

  beforeEach(async () => {
    await clearDatabase();
  });

  describe('GET /creator/dashboard', () => {
    it('should return creator dashboard stats', async () => {
      const creator = await createTestUser({ username: 'creator_dash', is_creator: true });
      await createTestCategory();
      await createTestRoom(creator.user.id, { title: 'Room 1', status: 'live' });
      await createTestRoom(creator.user.id, { title: 'Room 2', status: 'ended', listener_count: 50 });

      const response = await request(getApp())
        .get('/creator/dashboard')
        .set('Authorization', `Bearer ${creator.token}`);

      expect(response.status).toBe(200);
      expect(response.body.user.id).toBe(creator.user.id);
      expect(response.body.stats.totalRooms).toBe(2);
      expect(response.body.stats.totalListeners).toBe(50);
      expect(response.body.recentRooms).toBeDefined();
      expect(response.body.recentRooms.length).toBeLessThanOrEqual(5);
    });

    it('should return empty stats for new creator', async () => {
      const creator = await createTestUser({ username: 'new_creator' });

      const response = await request(getApp())
        .get('/creator/dashboard')
        .set('Authorization', `Bearer ${creator.token}`);

      expect(response.status).toBe(200);
      expect(response.body.stats.totalRooms).toBe(0);
      expect(response.body.stats.totalGemsReceived).toBe(0);
    });

    it('should require authentication', async () => {
      const response = await request(getApp()).get('/creator/dashboard');
      expect(response.status).toBe(401);
    });
  });

  describe('GET /creator/earnings', () => {
    it('should return earnings breakdown', async () => {
      const creator = await createTestUser({ username: 'earner' });
      const supporter = await createTestUser({ username: 'supporter', gem_balance: 500 });

      const gemRepo = AppDataSource.getRepository(GemTransaction);
      await gemRepo.save({ sender: supporter.user, receiver: creator.user, amount: 100, type: TransactionType.GIFT });
      await gemRepo.save({ sender: supporter.user, receiver: creator.user, amount: 50, type: TransactionType.GIFT });

      const response = await request(getApp())
        .get('/creator/earnings')
        .set('Authorization', `Bearer ${creator.token}`);

      expect(response.status).toBe(200);
      expect(response.body.totalGems).toBe(150);
      expect(response.body.transactionCount).toBe(2);
      expect(response.body.dailyBreakdown).toBeDefined();
      expect(response.body.recentTransactions).toBeDefined();
    });

    it('should filter earnings by date range', async () => {
      const creator = await createTestUser({ username: 'date_filtered' });

      const response = await request(getApp())
        .get('/creator/earnings?from=2024-01-01&to=2024-12-31')
        .set('Authorization', `Bearer ${creator.token}`);

      expect(response.status).toBe(200);
      expect(response.body.totalGems).toBe(0);
    });
  });

  describe('GET /creator/rooms', () => {
    it('should return rooms hosted by creator', async () => {
      const creator = await createTestUser({ username: 'room_host' });
      await createTestRoom(creator.user.id, { title: 'Hosted Room 1' });
      await createTestRoom(creator.user.id, { title: 'Hosted Room 2' });

      const response = await request(getApp())
        .get('/creator/rooms')
        .set('Authorization', `Bearer ${creator.token}`);

      expect(response.status).toBe(200);
      expect(response.body.rooms).toHaveLength(2);
      expect(response.body.total).toBe(2);
    });

    it('should support pagination', async () => {
      const creator = await createTestUser({ username: 'pager' });
      await createTestRoom(creator.user.id, { title: 'P1' });
      await createTestRoom(creator.user.id, { title: 'P2' });
      await createTestRoom(creator.user.id, { title: 'P3' });

      const page1 = await request(getApp())
        .get('/creator/rooms?limit=2&offset=0')
        .set('Authorization', `Bearer ${creator.token}`);

      expect(page1.status).toBe(200);
      expect(page1.body.rooms).toHaveLength(2);
      expect(page1.body.hasMore).toBe(true);

      const page2 = await request(getApp())
        .get('/creator/rooms?limit=2&offset=2')
        .set('Authorization', `Bearer ${creator.token}`);

      expect(page2.status).toBe(200);
      expect(page2.body.rooms).toHaveLength(1);
      expect(page2.body.hasMore).toBe(false);
    });
  });

  describe('GET /creator/top-supporters', () => {
    it('should return top supporters by gems gifted', async () => {
      const creator = await createTestUser({ username: 'gifted_creator' });
      const supporter1 = await createTestUser({ username: 'big_fan', gem_balance: 1000 });
      const supporter2 = await createTestUser({ username: 'small_fan', gem_balance: 500 });

      const gemRepo = AppDataSource.getRepository(GemTransaction);
      await gemRepo.save({ sender: supporter1.user, receiver: creator.user, amount: 200, type: TransactionType.GIFT });
      await gemRepo.save({ sender: supporter1.user, receiver: creator.user, amount: 100, type: TransactionType.GIFT });
      await gemRepo.save({ sender: supporter2.user, receiver: creator.user, amount: 50, type: TransactionType.GIFT });

      const response = await request(getApp())
        .get('/creator/top-supporters')
        .set('Authorization', `Bearer ${creator.token}`);

      expect(response.status).toBe(200);
      expect(response.body).toHaveLength(2);
      expect(response.body[0].totalGems).toBe(300);
      expect(response.body[0].giftCount).toBe(2);
    });

    it('should return empty list when no supporters', async () => {
      const creator = await createTestUser({ username: 'lonely_creator' });

      const response = await request(getApp())
        .get('/creator/top-supporters')
        .set('Authorization', `Bearer ${creator.token}`);

      expect(response.status).toBe(200);
      expect(response.body).toHaveLength(0);
    });
  });

  describe('Gem withdrawal', () => {
    it('should request a gem withdrawal', async () => {
      const creator = await createTestUser({ username: 'withdrawer', gem_balance: 5000 });

      const response = await request(getApp())
        .post('/withdrawals/')
        .set('Authorization', `Bearer ${creator.token}`)
        .send({ amount: 2000, payout_method: 'stripe', payout_details: { accountId: 'acct_test123' } });

      expect(response.status).toBe(200);
      expect(response.body.amount).toBe(2000);
      expect(response.body.status).toBe('pending');
      expect(response.body.payout_method).toBe('stripe');
    });

    it('should reject withdrawal below minimum (1000 gems)', async () => {
      const creator = await createTestUser({ username: 'low_bal_withdraw', gem_balance: 500 });

      const response = await request(getApp())
        .post('/withdrawals/')
        .set('Authorization', `Bearer ${creator.token}`)
        .send({ amount: 500 });

      expect(response.status).toBe(400);
      expect(response.body.error).toContain('Minimum');
    });

    it('should reject withdrawal with insufficient balance', async () => {
      const creator = await createTestUser({ username: 'poor_withdraw', gem_balance: 1000 });

      const response = await request(getApp())
        .post('/withdrawals/')
        .set('Authorization', `Bearer ${creator.token}`)
        .send({ amount: 5000 });

      expect(response.status).toBe(400);
      expect(response.body.error).toContain('Insufficient');
    });

    it('should list user withdrawals', async () => {
      const creator = await createTestUser({ username: 'list_wd', gem_balance: 10000 });

      await request(getApp())
        .post('/withdrawals/')
        .set('Authorization', `Bearer ${creator.token}`)
        .send({ amount: 1000 });

      await request(getApp())
        .post('/withdrawals/')
        .set('Authorization', `Bearer ${creator.token}`)
        .send({ amount: 2000 });

      const response = await request(getApp())
        .get('/withdrawals/')
        .set('Authorization', `Bearer ${creator.token}`);

      expect(response.status).toBe(200);
      expect(response.body).toHaveLength(2);
    });

    it('should require authentication for withdrawal', async () => {
      const response = await request(getApp())
        .post('/withdrawals/')
        .send({ amount: 1000 });

      expect(response.status).toBe(401);
    });
  });
});
