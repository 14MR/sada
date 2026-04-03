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
        .post(`/api/follow/${target.user.id}/follow`)
        .set('Authorization', `Bearer ${follower.token}`)
        .send({ userId: follower.user.id });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });

    it('should not allow following yourself', async () => {
      const user = await createTestUser();

      const response = await request(getApp())
        .post(`/api/follow/${user.user.id}/follow`)
        .set('Authorization', `Bearer ${user.token}`)
        .send({ userId: user.user.id });

      expect(response.status).toBe(400);
      expect(response.body.error).toContain('yourself');
    });

    it('should not allow following non-existent user', async () => {
      const follower = await createTestUser();

      const response = await request(getApp())
        .post('/api/follow/non-existent-id/follow')
        .set('Authorization', `Bearer ${follower.token}`)
        .send({ userId: follower.user.id });

      expect(response.status).toBe(400);
    });

    it('should unfollow a user', async () => {
      const follower = await createTestUser({ username: 'unfollower' });
      const target = await createTestUser({ username: 'unfollow_target' });

      await request(getApp())
        .post(`/api/follow/${target.user.id}/follow`)
        .set('Authorization', `Bearer ${follower.token}`)
        .send({ userId: follower.user.id });

      const response = await request(getApp())
        .delete(`/api/follow/${target.user.id}/follow`)
        .set('Authorization', `Bearer ${follower.token}`)
        .send({ userId: follower.user.id });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });

    it('should return empty following list after unfollow', async () => {
      const follower = await createTestUser({ username: 'f1' });
      const target = await createTestUser({ username: 't1' });

      await request(getApp())
        .post(`/api/follow/${target.user.id}/follow`)
        .set('Authorization', `Bearer ${follower.token}`)
        .send({ userId: follower.user.id });

      await request(getApp())
        .delete(`/api/follow/${target.user.id}/follow`)
        .set('Authorization', `Bearer ${follower.token}`)
        .send({ userId: follower.user.id });

      const followingRes = await request(getApp())
        .get(`/api/follow/${follower.user.id}/following`)
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
        .post(`/api/follow/${target.user.id}/follow`)
        .set('Authorization', `Bearer ${fan1.token}`)
        .send({ userId: fan1.user.id });

      await request(getApp())
        .post(`/api/follow/${target.user.id}/follow`)
        .set('Authorization', `Bearer ${fan2.token}`)
        .send({ userId: fan2.user.id });

      const response = await request(getApp())
        .get(`/api/follow/${target.user.id}/followers`)
        .set('Authorization', `Bearer ${target.token}`);

      expect(response.status).toBe(200);
      expect(response.body).toHaveLength(2);
    });

    it('should list following of a user', async () => {
      const user = await createTestUser({ username: 'social_user' });
      const target1 = await createTestUser({ username: 'social_t1' });
      const target2 = await createTestUser({ username: 'social_t2' });

      await request(getApp())
        .post(`/api/follow/${target1.user.id}/follow`)
        .set('Authorization', `Bearer ${user.token}`)
        .send({ userId: user.user.id });

      await request(getApp())
        .post(`/api/follow/${target2.user.id}/follow`)
        .set('Authorization', `Bearer ${user.token}`)
        .send({ userId: user.user.id });

      const response = await request(getApp())
        .get(`/api/follow/${user.user.id}/following`)
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
        .post('/api/moderation/block')
        .set('Authorization', `Bearer ${blocker.token}`)
        .send({ blockedId: target.user.id });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });

    it('should not allow blocking yourself', async () => {
      const user = await createTestUser();

      const response = await request(getApp())
        .post('/api/moderation/block')
        .set('Authorization', `Bearer ${user.token}`)
        .send({ blockedId: user.user.id });

      expect(response.status).toBe(400);
      expect(response.body.error).toContain('yourself');
    });

    it('should not allow duplicate block', async () => {
      const blocker = await createTestUser({ username: 'dbl_blocker' });
      const target = await createTestUser({ username: 'dbl_target' });

      await request(getApp())
        .post('/api/moderation/block')
        .set('Authorization', `Bearer ${blocker.token}`)
        .send({ blockedId: target.user.id });

      const response = await request(getApp())
        .post('/api/moderation/block')
        .set('Authorization', `Bearer ${blocker.token}`)
        .send({ blockedId: target.user.id });

      expect(response.status).toBe(400);
      expect(response.body.error).toContain('Already');
    });

    it('should unblock a user', async () => {
      const blocker = await createTestUser({ username: 'ub_blocker' });
      const target = await createTestUser({ username: 'ub_target' });

      await request(getApp())
        .post('/api/moderation/block')
        .set('Authorization', `Bearer ${blocker.token}`)
        .send({ blockedId: target.user.id });

      const response = await request(getApp())
        .post('/api/moderation/unblock')
        .set('Authorization', `Bearer ${blocker.token}`)
        .send({ blockedId: target.user.id });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });

    it('should return 404 when unblocking non-blocked user', async () => {
      const user = await createTestUser();
      const other = await createTestUser();

      const response = await request(getApp())
        .post('/api/moderation/unblock')
        .set('Authorization', `Bearer ${user.token}`)
        .send({ blockedId: other.user.id });

      expect(response.status).toBe(404);
    });

    it('should list blocked users', async () => {
      const user = await createTestUser({ username: 'block_lister' });
      const blocked1 = await createTestUser({ username: 'blocked1' });
      const blocked2 = await createTestUser({ username: 'blocked2' });

      await request(getApp())
        .post('/api/moderation/block')
        .set('Authorization', `Bearer ${user.token}`)
        .send({ blockedId: blocked1.user.id });

      await request(getApp())
        .post('/api/moderation/block')
        .set('Authorization', `Bearer ${user.token}`)
        .send({ blockedId: blocked2.user.id });

      const response = await request(getApp())
        .get('/api/moderation/blocked')
        .set('Authorization', `Bearer ${user.token}`);

      expect(response.status).toBe(200);
      expect(response.body).toHaveLength(2);
    });
  });

  // ── Notifications ──────────────────────────────────────────────

  describe('GET /notifications', () => {
    it('should return notifications for authenticated user', async () => {
      const user = await createTestUser({ username: 'notif_user' });

      const response = await request(getApp())
        .get('/api/notifications')
        .set('Authorization', `Bearer ${user.token}`);

      expect(response.status).toBe(200);
      expect(Array.isArray(response.body)).toBe(true);
    });

    it('should require authentication', async () => {
      const response = await request(getApp()).get('/api/notifications');
      expect(response.status).toBe(401);
    });
  });

  // ── User Search (from socialEnhancements) ──────────────────────

  describe('GET /users/search', () => {
    it('should search users by username', async () => {
      await createTestUser({ username: 'alice_wonder', display_name: 'Alice' });
      await createTestUser({ username: 'bob_builder', display_name: 'Bob' });

      const searcher = await createTestUser({ username: 'searcher1' });

      const response = await request(getApp())
        .get('/api/users/search?q=alice')
        .set('Authorization', `Bearer ${searcher.token}`);

      expect(response.status).toBe(200);
      expect(response.body.some((u: any) => u.username === 'alice_wonder')).toBe(true);
    });

    it('should search users by display_name', async () => {
      await createTestUser({ username: 'search_dn1', display_name: 'Zara Unique' });
      const searcher = await createTestUser({ username: 'searcher2' });

      const response = await request(getApp())
        .get('/api/users/search?q=Zara')
        .set('Authorization', `Bearer ${searcher.token}`);

      expect(response.status).toBe(200);
      expect(response.body.some((u: any) => u.display_name === 'Zara Unique')).toBe(true);
    });

    it('should return empty for no matches', async () => {
      const searcher = await createTestUser({ username: 'searcher3' });

      const response = await request(getApp())
        .get('/api/users/search?q=zzz_nonexistent_xyz')
        .set('Authorization', `Bearer ${searcher.token}`);

      expect(response.status).toBe(200);
      expect(response.body).toHaveLength(0);
    });

    it('should support pagination', async () => {
      for (let i = 0; i < 5; i++) {
        await createTestUser({ username: `pag_user_${i}`, display_name: 'PagTest' });
      }
      const searcher = await createTestUser({ username: 'pag_searcher' });

      const page1 = await request(getApp())
        .get('/api/users/search?q=PagTest&limit=2&offset=0')
        .set('Authorization', `Bearer ${searcher.token}`);

      const page2 = await request(getApp())
        .get('/api/users/search?q=PagTest&limit=2&offset=2')
        .set('Authorization', `Bearer ${searcher.token}`);

      expect(page1.body).toHaveLength(2);
      expect(page2.body).toHaveLength(2);
    });
  });

  // ── Public Profile ─────────────────────────────────────────────

  describe('GET /users/:id', () => {
    it('should return user profile with stats', async () => {
      const user = await createTestUser({ username: 'pub_profile_user', display_name: 'Public User' });

      const response = await request(getApp())
        .get(`/api/users/${user.user.id}`)
        .set('Authorization', `Bearer ${user.token}`);

      expect(response.status).toBe(200);
      expect(response.body.username).toBe('pub_profile_user');
    });

    it('should return 404 for non-existent user', async () => {
      const user = await createTestUser({ username: 'profile_404' });

      const response = await request(getApp())
        .get('/api/users/non-existent-id')
        .set('Authorization', `Bearer ${user.token}`);

      expect(response.status).toBe(404);
    });
  });

  // ── Activity Feed (from socialEnhancements) ────────────────────

  describe('GET /users/activity', () => {
    it('should return empty activity for new user', async () => {
      const user = await createTestUser({ username: 'act_new' });

      const response = await request(getApp())
        .get('/api/users/activity')
        .set('Authorization', `Bearer ${user.token}`);

      expect(response.status).toBe(200);
      expect(response.body.activities).toHaveLength(0);
    });

    it('should require authentication', async () => {
      const response = await request(getApp())
        .get('/api/users/activity');

      expect(response.status).toBe(401);
    });

    it('should record room_created activity when creating a room', async () => {
      const user = await createTestUser({ username: 'act_room_host' });

      await request(getApp())
        .post('/api/rooms/')
        .set('Authorization', `Bearer ${user.token}`)
        .send({ title: 'Activity Test Room' });

      await new Promise(r => setTimeout(r, 100));

      const response = await request(getApp())
        .get('/api/users/activity')
        .set('Authorization', `Bearer ${user.token}`);

      expect(response.status).toBe(200);
      expect(response.body.activities.some((a: any) => a.type === 'room_created')).toBe(true);
    });

    it('should record follower_gained activity when someone follows you', async () => {
      const target = await createTestUser({ username: 'act_follow_target' });
      const follower = await createTestUser({ username: 'act_follower' });

      await request(getApp())
        .post(`/api/follow/${target.user.id}/follow`)
        .set('Authorization', `Bearer ${follower.token}`)
        .send({});

      await new Promise(r => setTimeout(r, 100));

      const response = await request(getApp())
        .get('/api/users/activity')
        .set('Authorization', `Bearer ${target.token}`);

      expect(response.status).toBe(200);
      expect(response.body.activities.some((a: any) => a.type === 'follower_gained')).toBe(true);
    });
  });
});
