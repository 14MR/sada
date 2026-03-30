import request from 'supertest';
import { setupTestDB, clearDatabase, createTestUser, getApp } from './helpers';

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

describe('Social E2E', () => {
  beforeAll(async () => {
    await setupTestDB();
  });

  beforeEach(async () => {
    await clearDatabase();
  });

  describe('Follow / Unfollow', () => {
    it('should follow a user', async () => {
      const follower = await createTestUser({ username: 'follower1' });
      const target = await createTestUser({ username: 'target1' });

      const response = await request(getApp())
        .post(`/follow/${target.user.id}/follow`)
        .set('Authorization', `Bearer ${follower.token}`)
        .send({ userId: follower.user.id });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });

    it('should not allow following yourself', async () => {
      const user = await createTestUser();

      const response = await request(getApp())
        .post(`/follow/${user.user.id}/follow`)
        .set('Authorization', `Bearer ${user.token}`)
        .send({ userId: user.user.id });

      expect(response.status).toBe(400);
      expect(response.body.error).toContain('yourself');
    });

    it('should not allow following non-existent user', async () => {
      const follower = await createTestUser();

      const response = await request(getApp())
        .post('/follow/non-existent-id/follow')
        .set('Authorization', `Bearer ${follower.token}`)
        .send({ userId: follower.user.id });

      expect(response.status).toBe(400);
    });

    it('should unfollow a user', async () => {
      const follower = await createTestUser({ username: 'unfollower' });
      const target = await createTestUser({ username: 'unfollow_target' });

      await request(getApp())
        .post(`/follow/${target.user.id}/follow`)
        .set('Authorization', `Bearer ${follower.token}`)
        .send({ userId: follower.user.id });

      const response = await request(getApp())
        .delete(`/follow/${target.user.id}/follow`)
        .set('Authorization', `Bearer ${follower.token}`)
        .send({ userId: follower.user.id });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });

    it('should return empty following list after unfollow', async () => {
      const follower = await createTestUser({ username: 'f1' });
      const target = await createTestUser({ username: 't1' });

      await request(getApp())
        .post(`/follow/${target.user.id}/follow`)
        .set('Authorization', `Bearer ${follower.token}`)
        .send({ userId: follower.user.id });

      await request(getApp())
        .delete(`/follow/${target.user.id}/follow`)
        .set('Authorization', `Bearer ${follower.token}`)
        .send({ userId: follower.user.id });

      const followingRes = await request(getApp())
        .get(`/follow/${follower.user.id}/following`)
        .set('Authorization', `Bearer ${follower.token}`);

      expect(followingRes.status).toBe(200);
      expect(followingRes.body).toHaveLength(0);
    });
  });

  describe('Followers / Following lists', () => {
    it('should list followers of a user', async () => {
      const target = await createTestUser({ username: 'popular' });
      const fan1 = await createTestUser({ username: 'fan1' });
      const fan2 = await createTestUser({ username: 'fan2' });

      await request(getApp())
        .post(`/follow/${target.user.id}/follow`)
        .set('Authorization', `Bearer ${fan1.token}`)
        .send({ userId: fan1.user.id });

      await request(getApp())
        .post(`/follow/${target.user.id}/follow`)
        .set('Authorization', `Bearer ${fan2.token}`)
        .send({ userId: fan2.user.id });

      const response = await request(getApp())
        .get(`/follow/${target.user.id}/followers`)
        .set('Authorization', `Bearer ${target.token}`);

      expect(response.status).toBe(200);
      expect(response.body).toHaveLength(2);
    });

    it('should list following of a user', async () => {
      const user = await createTestUser({ username: 'social_user' });
      const target1 = await createTestUser({ username: 'social_t1' });
      const target2 = await createTestUser({ username: 'social_t2' });

      await request(getApp())
        .post(`/follow/${target1.user.id}/follow`)
        .set('Authorization', `Bearer ${user.token}`)
        .send({ userId: user.user.id });

      await request(getApp())
        .post(`/follow/${target2.user.id}/follow`)
        .set('Authorization', `Bearer ${user.token}`)
        .send({ userId: user.user.id });

      const response = await request(getApp())
        .get(`/follow/${user.user.id}/following`)
        .set('Authorization', `Bearer ${user.token}`);

      expect(response.status).toBe(200);
      expect(response.body).toHaveLength(2);
    });
  });

  describe('Block / Unblock', () => {
    it('should block a user', async () => {
      const blocker = await createTestUser({ username: 'blocker' });
      const target = await createTestUser({ username: 'blocked_target' });

      const response = await request(getApp())
        .post('/moderation/block')
        .set('Authorization', `Bearer ${blocker.token}`)
        .send({ blockedId: target.user.id });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });

    it('should not allow blocking yourself', async () => {
      const user = await createTestUser();

      const response = await request(getApp())
        .post('/moderation/block')
        .set('Authorization', `Bearer ${user.token}`)
        .send({ blockedId: user.user.id });

      expect(response.status).toBe(400);
      expect(response.body.error).toContain('yourself');
    });

    it('should not allow duplicate block', async () => {
      const blocker = await createTestUser({ username: 'dbl_blocker' });
      const target = await createTestUser({ username: 'dbl_target' });

      await request(getApp())
        .post('/moderation/block')
        .set('Authorization', `Bearer ${blocker.token}`)
        .send({ blockedId: target.user.id });

      const response = await request(getApp())
        .post('/moderation/block')
        .set('Authorization', `Bearer ${blocker.token}`)
        .send({ blockedId: target.user.id });

      expect(response.status).toBe(400);
      expect(response.body.error).toContain('Already');
    });

    it('should unblock a user', async () => {
      const blocker = await createTestUser({ username: 'ub_blocker' });
      const target = await createTestUser({ username: 'ub_target' });

      await request(getApp())
        .post('/moderation/block')
        .set('Authorization', `Bearer ${blocker.token}`)
        .send({ blockedId: target.user.id });

      const response = await request(getApp())
        .post('/moderation/unblock')
        .set('Authorization', `Bearer ${blocker.token}`)
        .send({ blockedId: target.user.id });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });

    it('should return 404 when unblocking non-blocked user', async () => {
      const user = await createTestUser();
      const other = await createTestUser();

      const response = await request(getApp())
        .post('/moderation/unblock')
        .set('Authorization', `Bearer ${user.token}`)
        .send({ blockedId: other.user.id });

      expect(response.status).toBe(404);
    });

    it('should list blocked users', async () => {
      const user = await createTestUser({ username: 'block_lister' });
      const blocked1 = await createTestUser({ username: 'blocked1' });
      const blocked2 = await createTestUser({ username: 'blocked2' });

      await request(getApp())
        .post('/moderation/block')
        .set('Authorization', `Bearer ${user.token}`)
        .send({ blockedId: blocked1.user.id });

      await request(getApp())
        .post('/moderation/block')
        .set('Authorization', `Bearer ${user.token}`)
        .send({ blockedId: blocked2.user.id });

      const response = await request(getApp())
        .get('/moderation/blocked')
        .set('Authorization', `Bearer ${user.token}`);

      expect(response.status).toBe(200);
      expect(response.body).toHaveLength(2);
    });
  });

  describe('Report user', () => {
    it('should report a user', async () => {
      const reporter = await createTestUser({ username: 'reporter' });
      const reported = await createTestUser({ username: 'reported_user' });

      const response = await request(getApp())
        .post('/moderation/report')
        .set('Authorization', `Bearer ${reporter.token}`)
        .send({ reportedUserId: reported.user.id, reason: 'harassment', description: 'Being mean' });

      expect(response.status).toBe(201);
      expect(response.body.id).toBeDefined();
      expect(response.body.status).toBe('submitted');
    });

    it('should not allow reporting yourself', async () => {
      const user = await createTestUser();

      const response = await request(getApp())
        .post('/moderation/report')
        .set('Authorization', `Bearer ${user.token}`)
        .send({ reportedUserId: user.user.id, reason: 'harassment' });

      expect(response.status).toBe(400);
      expect(response.body.error).toContain('yourself');
    });

    it('should require reportedUserId and reason', async () => {
      const user = await createTestUser();

      const response = await request(getApp())
        .post('/moderation/report')
        .set('Authorization', `Bearer ${user.token}`)
        .send({ description: 'Missing fields' });

      expect(response.status).toBe(400);
    });

    it('should reject invalid report reason', async () => {
      const reporter = await createTestUser();
      const reported = await createTestUser();

      const response = await request(getApp())
        .post('/moderation/report')
        .set('Authorization', `Bearer ${reporter.token}`)
        .send({ reportedUserId: reported.user.id, reason: 'invalid_reason' });

      expect(response.status).toBe(400);
      expect(response.body.error).toContain('Invalid reason');
    });

    it('should require authentication for reporting', async () => {
      const response = await request(getApp())
        .post('/moderation/report')
        .send({ reportedUserId: 'some-id', reason: 'harassment' });

      expect(response.status).toBe(401);
    });
  });

  describe('GET /notifications', () => {
    it('should return notifications list for authenticated user', async () => {
      const user = await createTestUser({ username: 'notif_user' });

      const response = await request(getApp())
        .get('/notifications')
        .set('Authorization', `Bearer ${user.token}`);

      expect(response.status).toBe(200);
      expect(Array.isArray(response.body)).toBe(true);
    });

    it('should require authentication', async () => {
      const response = await request(getApp()).get('/notifications');
      expect(response.status).toBe(401);
    });
  });
});
