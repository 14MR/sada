import request from 'supertest';
import { setupTestDB, clearDatabase, createTestUser, getApp, createTestRoom, createTestCategory } from './helpers';

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

describe('Social Enhancements E2E', () => {
  beforeAll(async () => {
    await setupTestDB();
  });

  beforeEach(async () => {
    await clearDatabase();
  });

  // ═══════════════════════════════════════════════════════════════════
  // Feature 1: User Blocking System (/users/block routes + enforcement)
  // ═══════════════════════════════════════════════════════════════════

  describe('POST /users/block', () => {
    it('should block a user', async () => {
      const blocker = await createTestUser({ username: 'ub_blocker' });
      const target = await createTestUser({ username: 'ub_target' });

      const response = await request(getApp())
        .post('/users/block')
        .set('Authorization', `Bearer ${blocker.token}`)
        .send({ blockedId: target.user.id });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });

    it('should not allow blocking yourself', async () => {
      const user = await createTestUser({ username: 'ub_self' });

      const response = await request(getApp())
        .post('/users/block')
        .set('Authorization', `Bearer ${user.token}`)
        .send({ blockedId: user.user.id });

      expect(response.status).toBe(400);
      expect(response.body.error).toContain('yourself');
    });

    it('should not allow duplicate block', async () => {
      const blocker = await createTestUser({ username: 'ub_dbl1' });
      const target = await createTestUser({ username: 'ub_dbl2' });

      await request(getApp())
        .post('/users/block')
        .set('Authorization', `Bearer ${blocker.token}`)
        .send({ blockedId: target.user.id });

      const response = await request(getApp())
        .post('/users/block')
        .set('Authorization', `Bearer ${blocker.token}`)
        .send({ blockedId: target.user.id });

      expect(response.status).toBe(400);
      expect(response.body.error).toContain('Already');
    });

    it('should require authentication', async () => {
      const response = await request(getApp())
        .post('/users/block')
        .send({ blockedId: 'some-id' });

      expect(response.status).toBe(401);
    });

    it('should require blockedId', async () => {
      const user = await createTestUser({ username: 'ub_noid' });

      const response = await request(getApp())
        .post('/users/block')
        .set('Authorization', `Bearer ${user.token}`)
        .send({});

      expect(response.status).toBe(400);
    });
  });

  describe('DELETE /users/block/:userId', () => {
    it('should unblock a user', async () => {
      const blocker = await createTestUser({ username: 'ubu_blocker' });
      const target = await createTestUser({ username: 'ubu_target' });

      await request(getApp())
        .post('/users/block')
        .set('Authorization', `Bearer ${blocker.token}`)
        .send({ blockedId: target.user.id });

      const response = await request(getApp())
        .delete(`/users/block/${target.user.id}`)
        .set('Authorization', `Bearer ${blocker.token}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });

    it('should return 404 when unblocking non-blocked user', async () => {
      const user = await createTestUser({ username: 'ubu_404' });
      const other = await createTestUser({ username: 'ubu_other' });

      const response = await request(getApp())
        .delete(`/users/block/${other.user.id}`)
        .set('Authorization', `Bearer ${user.token}`);

      expect(response.status).toBe(404);
    });

    it('should require authentication', async () => {
      const response = await request(getApp())
        .delete('/users/block/some-id');

      expect(response.status).toBe(401);
    });
  });

  describe('GET /users/blocked', () => {
    it('should list blocked users', async () => {
      const user = await createTestUser({ username: 'ub_list1' });
      const blocked1 = await createTestUser({ username: 'ub_list_b1' });
      const blocked2 = await createTestUser({ username: 'ub_list_b2' });

      await request(getApp())
        .post('/users/block')
        .set('Authorization', `Bearer ${user.token}`)
        .send({ blockedId: blocked1.user.id });

      await request(getApp())
        .post('/users/block')
        .set('Authorization', `Bearer ${user.token}`)
        .send({ blockedId: blocked2.user.id });

      const response = await request(getApp())
        .get('/users/blocked')
        .set('Authorization', `Bearer ${user.token}`);

      expect(response.status).toBe(200);
      expect(response.body).toHaveLength(2);
    });

    it('should return empty list when no users blocked', async () => {
      const user = await createTestUser({ username: 'ub_empty' });

      const response = await request(getApp())
        .get('/users/blocked')
        .set('Authorization', `Bearer ${user.token}`);

      expect(response.status).toBe(200);
      expect(response.body).toHaveLength(0);
    });
  });

  describe('Block Enforcement', () => {
    it('should prevent blocked user from joining same room', async () => {
      const host = await createTestUser({ username: 'be_host' });
      const blocked = await createTestUser({ username: 'be_blocked' });

      await request(getApp())
        .post('/users/block')
        .set('Authorization', `Bearer ${host.token}`)
        .send({ blockedId: blocked.user.id });

      const room = await createTestRoom(host.user.id, { title: 'Blocked Room' });

      const response = await request(getApp())
        .post(`/rooms/${room.id}/join`)
        .set('Authorization', `Bearer ${blocked.token}`)
        .send({});

      expect(response.status).toBe(400);
      expect(response.body.error).toContain('Cannot join');
    });

    it('should prevent sending gems to a blocked user', async () => {
      const sender = await createTestUser({ username: 'be_sender', gem_balance: 500 });
      const blocked = await createTestUser({ username: 'be_gem_blocked' });

      await request(getApp())
        .post('/users/block')
        .set('Authorization', `Bearer ${sender.token}`)
        .send({ blockedId: blocked.user.id });

      const response = await request(getApp())
        .post('/gems/gift')
        .set('Authorization', `Bearer ${sender.token}`)
        .send({ receiverId: blocked.user.id, amount: 10 });

      expect(response.status).toBe(400);
      expect(response.body.error).toContain('Cannot send gems');
    });

    it('should prevent following a blocked user', async () => {
      const user = await createTestUser({ username: 'be_follower' });
      const blocked = await createTestUser({ username: 'be_follow_blocked' });

      await request(getApp())
        .post('/users/block')
        .set('Authorization', `Bearer ${user.token}`)
        .send({ blockedId: blocked.user.id });

      const response = await request(getApp())
        .post(`/follow/${blocked.user.id}/follow`)
        .set('Authorization', `Bearer ${user.token}`)
        .send({});

      expect(response.status).toBe(400);
      expect(response.body.error).toContain('Cannot follow');
    });

    it('should allow actions after unblocking', async () => {
      const user = await createTestUser({ username: 'be_unblock_user' });
      const target = await createTestUser({ username: 'be_unblock_target' });

      await request(getApp())
        .post('/users/block')
        .set('Authorization', `Bearer ${user.token}`)
        .send({ blockedId: target.user.id });

      await request(getApp())
        .delete(`/users/block/${target.user.id}`)
        .set('Authorization', `Bearer ${user.token}`);

      const response = await request(getApp())
        .post(`/follow/${target.user.id}/follow`)
        .set('Authorization', `Bearer ${user.token}`)
        .send({});

      expect(response.status).toBe(200);
    });
  });

  // ═══════════════════════════════════════════════════════════════════
  // Feature 2: Enhanced User Search
  // ═══════════════════════════════════════════════════════════════════

  describe('GET /users/search', () => {
    it('should search users by username', async () => {
      await createTestUser({ username: 'alice_wonder', display_name: 'Alice' });
      await createTestUser({ username: 'bob_builder', display_name: 'Bob' });
      await createTestUser({ username: 'charlie_day', display_name: 'Charlie' });

      const response = await request(getApp())
        .get('/users/search?q=alice')
        .set('Authorization', `Bearer ${(await createTestUser({ username: 'searcher1' })).token}`);

      expect(response.status).toBe(200);
      expect(response.body.length).toBeGreaterThanOrEqual(1);
      expect(response.body.some((u: any) => u.username === 'alice_wonder')).toBe(true);
    });

    it('should search users by display_name', async () => {
      await createTestUser({ username: 'search_dn1', display_name: 'Zara Unique' });

      const response = await request(getApp())
        .get('/users/search?q=Zara')
        .set('Authorization', `Bearer ${(await createTestUser({ username: 'searcher2' })).token}`);

      expect(response.status).toBe(200);
      expect(response.body.length).toBeGreaterThanOrEqual(1);
      expect(response.body.some((u: any) => u.display_name === 'Zara Unique')).toBe(true);
    });

    it('should return empty for no matches', async () => {
      await createTestUser({ username: 'no_match_user' });

      const response = await request(getApp())
        .get('/users/search?q=zzz_nonexistent_xyz')
        .set('Authorization', `Bearer ${(await createTestUser({ username: 'searcher3' })).token}`);

      expect(response.status).toBe(200);
      expect(response.body).toHaveLength(0);
    });

    it('should return empty for empty query', async () => {
      await createTestUser({ username: 'empty_q_user' });

      const response = await request(getApp())
        .get('/users/search?q=')
        .set('Authorization', `Bearer ${(await createTestUser({ username: 'searcher4' })).token}`);

      expect(response.status).toBe(200);
      expect(response.body).toHaveLength(0);
    });

    it('should support pagination', async () => {
      for (let i = 0; i < 5; i++) {
        await createTestUser({ username: `pag_user_${i}`, display_name: 'PagTest' });
      }

      const token = (await createTestUser({ username: 'pag_searcher' })).token;

      const page1 = await request(getApp())
        .get('/users/search?q=PagTest&limit=2&offset=0')
        .set('Authorization', `Bearer ${token}`);

      const page2 = await request(getApp())
        .get('/users/search?q=PagTest&limit=2&offset=2')
        .set('Authorization', `Bearer ${token}`);

      expect(page1.status).toBe(200);
      expect(page2.status).toBe(200);
      expect(page1.body).toHaveLength(2);
      expect(page2.body).toHaveLength(2);
    });
  });

  describe('GET /users/:id (public profile)', () => {
    it('should return user profile with stats', async () => {
      const user = await createTestUser({ username: 'pub_profile_user', display_name: 'Public User' });

      const response = await request(getApp())
        .get(`/users/${user.user.id}`)
        .set('Authorization', `Bearer ${user.token}`);

      expect(response.status).toBe(200);
      expect(response.body.username).toBe('pub_profile_user');
    });

    it('should return 404 for non-existent user', async () => {
      const user = await createTestUser({ username: 'profile_404' });

      const response = await request(getApp())
        .get('/users/non-existent-id')
        .set('Authorization', `Bearer ${user.token}`);

      expect(response.status).toBe(404);
    });
  });

  // ═══════════════════════════════════════════════════════════════════
  // Feature 3: Activity Feed
  // ═══════════════════════════════════════════════════════════════════

  describe('GET /users/activity', () => {
    it('should return empty activity for new user', async () => {
      const user = await createTestUser({ username: 'act_new' });

      const response = await request(getApp())
        .get('/users/activity')
        .set('Authorization', `Bearer ${user.token}`);

      expect(response.status).toBe(200);
      expect(response.body.activities).toHaveLength(0);
    });

    it('should require authentication', async () => {
      const response = await request(getApp())
        .get('/users/activity');

      expect(response.status).toBe(401);
    });

    it('should record room_created activity when creating a room', async () => {
      const user = await createTestUser({ username: 'act_room_host' });

      await request(getApp())
        .post('/rooms/')
        .set('Authorization', `Bearer ${user.token}`)
        .send({ title: 'Activity Test Room' });

      // Allow fire-and-forget activity recording to complete
      await new Promise((r) => setTimeout(r, 100));

      const response = await request(getApp())
        .get('/users/activity')
        .set('Authorization', `Bearer ${user.token}`);

      expect(response.status).toBe(200);
      expect(response.body.activities.length).toBeGreaterThanOrEqual(1);
      expect(response.body.activities.some((a: any) => a.type === 'room_created')).toBe(true);
    });

    it('should record follower_gained activity when someone follows you', async () => {
      const target = await createTestUser({ username: 'act_follow_target' });
      const follower = await createTestUser({ username: 'act_follower' });

      await request(getApp())
        .post(`/follow/${target.user.id}/follow`)
        .set('Authorization', `Bearer ${follower.token}`)
        .send({});

      await new Promise((r) => setTimeout(r, 100));

      const response = await request(getApp())
        .get('/users/activity')
        .set('Authorization', `Bearer ${target.token}`);

      expect(response.status).toBe(200);
      expect(response.body.activities.length).toBeGreaterThanOrEqual(1);
      expect(response.body.activities.some((a: any) => a.type === 'follower_gained')).toBe(true);
    });

    it('should record gem_received activity when receiving gems', async () => {
      const sender = await createTestUser({ username: 'act_gem_sender', gem_balance: 500 });
      const receiver = await createTestUser({ username: 'act_gem_receiver' });

      await request(getApp())
        .post('/gems/gift')
        .set('Authorization', `Bearer ${sender.token}`)
        .send({ receiverId: receiver.user.id, amount: 10 });

      await new Promise((r) => setTimeout(r, 100));

      const response = await request(getApp())
        .get('/users/activity')
        .set('Authorization', `Bearer ${receiver.token}`);

      expect(response.status).toBe(200);
      expect(response.body.activities.length).toBeGreaterThanOrEqual(1);
      expect(response.body.activities.some((a: any) => a.type === 'gem_received')).toBe(true);
    });

    it('should record room_joined activity when joining a room', async () => {
      const host = await createTestUser({ username: 'act_join_host' });
      const joiner = await createTestUser({ username: 'act_joiner' });

      const room = await createTestRoom(host.user.id, { title: 'Join Activity Room' });

      await request(getApp())
        .post(`/rooms/${room.id}/join`)
        .set('Authorization', `Bearer ${joiner.token}`)
        .send({});

      await new Promise((r) => setTimeout(r, 100));

      const response = await request(getApp())
        .get('/users/activity')
        .set('Authorization', `Bearer ${joiner.token}`);

      expect(response.status).toBe(200);
      expect(response.body.activities.length).toBeGreaterThanOrEqual(1);
      expect(response.body.activities.some((a: any) => a.type === 'room_joined')).toBe(true);
    });

    it('should support pagination via limit and offset', async () => {
      const user = await createTestUser({ username: 'act_pag' });

      const response = await request(getApp())
        .get('/users/activity?limit=5&offset=0')
        .set('Authorization', `Bearer ${user.token}`);

      expect(response.status).toBe(200);
      expect(response.body.limit).toBe(5);
      expect(response.body.offset).toBe(0);
    });
  });
});
