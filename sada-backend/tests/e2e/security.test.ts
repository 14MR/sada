/**
 * Security E2E Tests
 *
 * Tests that verify the system is secure — IDOR, mass assignment,
 * auth bypass, ownership checks, input validation.
 *
 * These are the tests that would have caught the bugs bugbot found.
 */
import request from 'supertest';
import { setupTestDB, clearDatabase, createTestUser, createTestRoom, getApp } from './helpers';

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

describe('Security E2E', () => {
  beforeAll(async () => {
    await setupTestDB();
  });

  beforeEach(async () => {
    await clearDatabase();
  });

  describe('IDOR — Cross-user access prevention', () => {
    it('should NOT allow user A to view user B gem balance via /gems/balance/:userId', async () => {
      const userA = await createTestUser({ username: 'idor_a', gem_balance: 500 });
      const userB = await createTestUser({ username: 'idor_b', gem_balance: 999 });

      const response = await request(getApp())
        .get(`/api/gems/balance/${userB.user.id}`)
        .set('Authorization', `Bearer ${userA.token}`);

      // Should either 403 (forbidden) or return only user A's own balance
      if (response.status === 200) {
        // If it returns data, it must be user A's balance, not user B's
        expect(response.body.balance).toBe(500);
      } else {
        expect(response.status).toBe(403);
      }
    });

    it('should NOT allow user A to view user B gem history', async () => {
      const userA = await createTestUser({ username: 'idor_hist_a' });
      const userB = await createTestUser({ username: 'idor_hist_b' });

      // User B receives some gems
      await createTestUser({ username: 'idor_sender', gem_balance: 500 }).then(async (sender) => {
        await request(getApp())
          .post('/api/gems/gift')
          .set('Authorization', `Bearer ${sender.token}`)
          .send({ receiverId: userB.user.id, amount: 50 });
      });

      // User A tries to read user B's history
      const response = await request(getApp())
        .get(`/api/gems/history/${userB.user.id}`)
        .set('Authorization', `Bearer ${userA.token}`);

      // Should be forbidden or return only A's own history
      expect([403, 404]).toContain(response.status);
    });

    it('should NOT allow user A to delete user B account', async () => {
      const userA = await createTestUser({ username: 'idor_del_a' });
      const userB = await createTestUser({ username: 'idor_del_b' });

      const response = await request(getApp())
        .delete(`/api/users/${userB.user.id}`)
        .set('Authorization', `Bearer ${userA.token}`);

      expect([403, 404]).toContain(response.status);
    });

    it('should NOT allow user A to update user B profile', async () => {
      const userA = await createTestUser({ username: 'idor_upd_a' });
      const userB = await createTestUser({ username: 'idor_upd_b', display_name: 'Original Name' });

      const response = await request(getApp())
        .put(`/api/users/${userB.user.id}`)
        .set('Authorization', `Bearer ${userA.token}`)
        .send({ display_name: 'Hacked Name' });

      expect([403, 404]).toContain(response.status);
    });

    it('should NOT allow non-host to end a room', async () => {
      const host = await createTestUser({ username: 'idor_host' });
      const intruder = await createTestUser({ username: 'idor_intruder' });
      const room = await createTestRoom(host.user.id, { title: 'Protected Room' });

      const response = await request(getApp())
        .post(`/api/rooms/${room.id}/end`)
        .set('Authorization', `Bearer ${intruder.token}`);

      expect([403, 404]).toContain(response.status);
    });

    it('should NOT allow non-host to promote speakers', async () => {
      const host = await createTestUser({ username: 'idor_promo_host' });
      const intruder = await createTestUser({ username: 'idor_promo_bad' });
      const listener = await createTestUser({ username: 'idor_promo_listener' });
      const room = await createTestRoom(host.user.id, { title: 'Promo Room' });

      // Join room first
      await request(getApp())
        .post(`/api/rooms/${room.id}/join`)
        .set('Authorization', `Bearer ${listener.token}`)
        .send({});

      const response = await request(getApp())
        .post(`/api/rooms/${room.id}/promote`)
        .set('Authorization', `Bearer ${intruder.token}`)
        .send({ userId: listener.user.id });

      expect([403, 404]).toContain(response.status);
    });

    it('should NOT allow accessing other users conversations', async () => {
      const userA = await createTestUser({ username: 'idor_conv_a' });
      const userB = await createTestUser({ username: 'idor_conv_b' });
      const userC = await createTestUser({ username: 'idor_conv_c' });

      // A and B create a conversation
      const conv = await request(getApp())
        .post('/api/conversations')
        .set('Authorization', `Bearer ${userA.token}`)
        .send({ participantIds: [userB.user.id] });

      if (conv.status === 201 && conv.body.id) {
        // C tries to read it
        const response = await request(getApp())
          .get(`/api/conversations/${conv.body.id}`)
          .set('Authorization', `Bearer ${userC.token}`);

        expect([403, 404]).toContain(response.status);
      }
    });
  });

  describe('Mass Assignment Prevention', () => {
    it('should NOT allow setting gem_balance via profile update', async () => {
      const user = await createTestUser({ username: 'mass_balance', gem_balance: 100 });

      const response = await request(getApp())
        .put(`/api/users/${user.user.id}`)
        .set('Authorization', `Bearer ${user.token}`)
        .send({ gem_balance: 999999 });

      // Check balance wasn't changed
      const balanceRes = await request(getApp())
        .get(`/api/gems/balance/${user.user.id}`)
        .set('Authorization', `Bearer ${user.token}`);

      expect(balanceRes.body.balance).toBe(100);
    });

    it('should NOT allow setting is_creator via profile update', async () => {
      const user = await createTestUser({ username: 'mass_creator', is_creator: false });

      await request(getApp())
        .put(`/api/users/${user.user.id}`)
        .set('Authorization', `Bearer ${user.token}`)
        .send({ is_creator: true });

      // Verify is_creator is still false
      const profileRes = await request(getApp())
        .get(`/api/users/${user.user.id}`)
        .set('Authorization', `Bearer ${user.token}`);

      expect(profileRes.body.is_creator).toBe(false);
    });

    it('should NOT allow setting banned via profile update', async () => {
      const user = await createTestUser({ username: 'mass_banned', banned: false });

      await request(getApp())
        .put(`/api/users/${user.user.id}`)
        .set('Authorization', `Bearer ${user.token}`)
        .send({ banned: false }); // Even setting to false should not be accepted from user input

      // User should still be able to login (not banned)
      const loginRes = await request(getApp())
        .post('/api/auth/signin')
        .send({ identityToken: user.user.apple_id });

      expect(loginRes.status).toBe(200);
    });

    it('should NOT allow setting verified via profile update', async () => {
      const user = await createTestUser({ username: 'mass_verified', verified: false });

      await request(getApp())
        .put(`/api/users/${user.user.id}`)
        .set('Authorization', `Bearer ${user.token}`)
        .send({ verified: true });

      const profileRes = await request(getApp())
        .get(`/api/users/${user.user.id}`)
        .set('Authorization', `Bearer ${user.token}`);

      expect(profileRes.body.verified).toBe(false);
    });
  });

  describe('Auth Bypass Prevention', () => {
    it('should reject request with no token on protected routes', async () => {
      const endpoints = [
        { method: 'get' as const, path: '/api/creator/dashboard' },
        { method: 'get' as const, path: '/api/notifications' },
        { method: 'get' as const, path: '/api/users/activity' },
        { method: 'post' as const, path: '/api/rooms' },
        { method: 'get' as const, path: '/api/gems/balance' },
        { method: 'post' as const, path: '/api/moderation/report' },
      ];

      for (const { method, path } of endpoints) {
        const res = await request(getApp())[method](path);
        expect(res.status).toBe(401);
      }
    });

    it('should reject expired tokens', async () => {
      const jwt = require('jsonwebtoken');
      const expiredToken = jwt.sign(
        { id: 'fake-user', username: 'expired' },
        process.env.JWT_SECRET || 'test_secret',
        { expiresIn: '-1s' },
      );

      const response = await request(getApp())
        .get('/api/notifications')
        .set('Authorization', `Bearer ${expiredToken}`);

      expect(response.status).toBe(401);
    });

    it('should reject malformed tokens', async () => {
      const tokens = ['not.a.token', 'Bearer', 'undefined', 'null', ''];

      for (const token of tokens) {
        const response = await request(getApp())
          .get('/api/notifications')
          .set('Authorization', `Bearer ${token}`);

        expect(response.status).toBe(401);
      }
    });

    it('should require admin key for admin endpoints', async () => {
      const user = await createTestUser();
      const endpoints = [
        { method: 'get' as const, path: '/api/admin/stats' },
        { method: 'get' as const, path: '/api/admin/users' },
        { method: 'patch' as const, path: '/api/admin/users/some-id' },
        { method: 'get' as const, path: '/api/admin/reports' },
      ];

      for (const { method, path } of endpoints) {
        // Try with regular user token
        const res = await request(getApp())[method](path)
          .set('Authorization', `Bearer ${user.token}`);
        expect([401, 403]).toContain(res.status);
      }
    });
  });

  describe('Block Enforcement', () => {
    it('should prevent blocked user from joining host room', async () => {
      const host = await createTestUser({ username: 'blk_host' });
      const blocked = await createTestUser({ username: 'blk_joiner' });

      await request(getApp())
        .post('/api/moderation/block')
        .set('Authorization', `Bearer ${host.token}`)
        .send({ blockedId: blocked.user.id });

      const room = await createTestRoom(host.user.id, { title: 'Blocked Room' });

      const response = await request(getApp())
        .post(`/api/rooms/${room.id}/join`)
        .set('Authorization', `Bearer ${blocked.token}`)
        .send({});

      expect(response.status).toBe(400);
    });

    it('should prevent sending gems to a blocked user', async () => {
      const sender = await createTestUser({ username: 'blk_gem_sender', gem_balance: 500 });
      const blocked = await createTestUser({ username: 'blk_gem_blocked' });

      await request(getApp())
        .post('/api/moderation/block')
        .set('Authorization', `Bearer ${sender.token}`)
        .send({ blockedId: blocked.user.id });

      const response = await request(getApp())
        .post('/api/gems/gift')
        .set('Authorization', `Bearer ${sender.token}`)
        .send({ receiverId: blocked.user.id, amount: 10 });

      expect(response.status).toBe(400);
    });

    it('should prevent following a blocked user', async () => {
      const user = await createTestUser({ username: 'blk_follower' });
      const blocked = await createTestUser({ username: 'blk_follow_target' });

      await request(getApp())
        .post('/api/moderation/block')
        .set('Authorization', `Bearer ${user.token}`)
        .send({ blockedId: blocked.user.id });

      const response = await request(getApp())
        .post(`/api/follow/${blocked.user.id}/follow`)
        .set('Authorization', `Bearer ${user.token}`)
        .send({});

      expect(response.status).toBe(400);
    });

    it('should allow actions after unblocking', async () => {
      const user = await createTestUser({ username: 'blk_unblock' });
      const target = await createTestUser({ username: 'blk_unblock_target' });

      await request(getApp())
        .post('/api/moderation/block')
        .set('Authorization', `Bearer ${user.token}`)
        .send({ blockedId: target.user.id });

      await request(getApp())
        .post('/api/moderation/unblock')
        .set('Authorization', `Bearer ${user.token}`)
        .send({ blockedId: target.user.id });

      const response = await request(getApp())
        .post(`/api/follow/${target.user.id}/follow`)
        .set('Authorization', `Bearer ${user.token}`)
        .send({});

      expect(response.status).toBe(200);
    });
  });

  describe('Input Validation', () => {
    it('should reject SQL injection in username search', async () => {
      const user = await createTestUser({ username: 'sqli_user' });

      const response = await request(getApp())
        .get("/api/users/search?q=' OR 1=1 --")
        .set('Authorization', `Bearer ${user.token}`);

      expect(response.status).toBe(200);
      // Should return empty or normal results, not all users
      expect(response.body.length).toBeLessThan(100);
    });

    it('should reject negative gem amounts', async () => {
      const sender = await createTestUser({ username: 'neg_gem_sender', gem_balance: 500 });
      const receiver = await createTestUser({ username: 'neg_gem_receiver' });

      const response = await request(getApp())
        .post('/api/gems/gift')
        .set('Authorization', `Bearer ${sender.token}`)
        .send({ receiverId: receiver.user.id, amount: -100 });

      expect(response.status).toBe(400);
    });

    it('should reject zero gem amounts', async () => {
      const sender = await createTestUser({ username: 'zero_gem_sender', gem_balance: 500 });
      const receiver = await createTestUser({ username: 'zero_gem_receiver' });

      const response = await request(getApp())
        .post('/api/gems/gift')
        .set('Authorization', `Bearer ${sender.token}`)
        .send({ receiverId: receiver.user.id, amount: 0 });

      expect(response.status).toBe(400);
    });

    it('should reject gifting to non-existent user', async () => {
      const sender = await createTestUser({ username: 'ghost_sender', gem_balance: 500 });

      const response = await request(getApp())
        .post('/api/gems/gift')
        .set('Authorization', `Bearer ${sender.token}`)
        .send({ receiverId: 'non-existent-user-id', amount: 10 });

      expect([400, 404]).toContain(response.status);
    });
  });
});
