/**
 * Admin E2E Tests — Consolidated
 *
 * Merged from: admin.test.ts + admin-analytics.test.ts
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

const ADMIN_KEY = 'test-admin-key';

describe('Admin E2E', () => {
  beforeAll(async () => {
    process.env.ADMIN_KEY = ADMIN_KEY;
    await setupTestDB();
  });

  beforeEach(async () => {
    await clearDatabase();
  });

  describe('GET /admin/stats', () => {
    it('should return platform stats with today metrics', async () => {
      const { token } = await createTestUser({ username: 'stats_auth' });
      await createTestUser({ username: 'stats_user1' });
      const host = await createTestUser({ username: 'stats_host' });
      await createTestRoom(host.user.id, { title: 'Live Room', status: 'live' });

      const response = await request(getApp())
        .get('/api/admin/stats')
        .set('Authorization', `Bearer ${token}`)
        .set('x-admin-key', ADMIN_KEY);

      expect(response.status).toBe(200);
      expect(response.body.totalUsers).toBeGreaterThanOrEqual(2);
      expect(response.body.rooms).toBeDefined();
      expect(response.body.activeRoomsToday).toBeGreaterThanOrEqual(1);
    });

    it('should reject without admin key', async () => {
      const { token } = await createTestUser();

      const response = await request(getApp())
        .get('/api/admin/stats')
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(403);
    });
  });

  describe('GET /admin/users', () => {
    it('should list users with pagination', async () => {
      const { token } = await createTestUser({ username: 'list_auth' });
      await createTestUser({ username: 'list_u1' });
      await createTestUser({ username: 'list_u2' });

      const response = await request(getApp())
        .get('/api/admin/users?limit=2&offset=0')
        .set('Authorization', `Bearer ${token}`)
        .set('x-admin-key', ADMIN_KEY);

      expect(response.status).toBe(200);
      expect(response.body.users).toBeDefined();
      expect(response.body.users.length).toBeLessThanOrEqual(2);
      expect(response.body.total).toBeGreaterThanOrEqual(3);
    });

    it('should search users by username', async () => {
      const { token } = await createTestUser({ username: 'search_auth' });
      await createTestUser({ username: 'search_alpha' });
      await createTestUser({ username: 'search_beta' });

      const response = await request(getApp())
        .get('/api/admin/users?search=search_alpha')
        .set('Authorization', `Bearer ${token}`)
        .set('x-admin-key', ADMIN_KEY);

      expect(response.status).toBe(200);
      expect(response.body.users.length).toBe(1);
      expect(response.body.users[0].username).toBe('search_alpha');
    });

    it('should filter by banned status', async () => {
      const { token } = await createTestUser({ username: 'filter_auth' });
      await createTestUser({ username: 'filter_banned', banned: true });
      await createTestUser({ username: 'filter_active', banned: false });

      const response = await request(getApp())
        .get('/api/admin/users?banned=true')
        .set('Authorization', `Bearer ${token}`)
        .set('x-admin-key', ADMIN_KEY);

      expect(response.status).toBe(200);
      response.body.users.forEach((u: any) => expect(u.banned).toBe(true));
    });

    it('should filter by creator status', async () => {
      const { token } = await createTestUser({ username: 'creator_auth' });
      await createTestUser({ username: 'creator_yes', is_creator: true });

      const response = await request(getApp())
        .get('/api/admin/users?is_creator=true')
        .set('Authorization', `Bearer ${token}`)
        .set('x-admin-key', ADMIN_KEY);

      expect(response.status).toBe(200);
      response.body.users.forEach((u: any) => expect(u.is_creator).toBe(true));
    });
  });

  describe('POST /admin/users/:id/ban and unban', () => {
    it('should ban a user', async () => {
      const { token } = await createTestUser({ username: 'ban_auth' });
      const { user } = await createTestUser({ username: 'to_ban' });

      const response = await request(getApp())
        .post(`/api/admin/users/${user.id}/ban`)
        .set('Authorization', `Bearer ${token}`)
        .set('x-admin-key', ADMIN_KEY);

      expect(response.status).toBe(200);
      expect(response.body.banned).toBe(true);
    });

    it('should unban a user', async () => {
      const { token } = await createTestUser({ username: 'unban_auth' });
      const { user } = await createTestUser({ username: 'to_unban', banned: true });

      const response = await request(getApp())
        .post(`/api/admin/users/${user.id}/unban`)
        .set('Authorization', `Bearer ${token}`)
        .set('x-admin-key', ADMIN_KEY);

      expect(response.status).toBe(200);
      expect(response.body.banned).toBe(false);
    });

    it('should return 404 for non-existent user', async () => {
      const { token } = await createTestUser({ username: 'ban_404_auth' });

      const response = await request(getApp())
        .post('/api/admin/users/non-existent-id/ban')
        .set('Authorization', `Bearer ${token}`)
        .set('x-admin-key', ADMIN_KEY);

      expect(response.status).toBe(404);
    });
  });

  describe('PATCH /admin/users/:id', () => {
    it('should update multiple fields at once', async () => {
      const { token } = await createTestUser({ username: 'patch_auth' });
      const { user } = await createTestUser({ username: 'to_multi_patch' });

      const response = await request(getApp())
        .patch(`/api/admin/users/${user.id}`)
        .set('Authorization', `Bearer ${token}`)
        .set('x-admin-key', ADMIN_KEY)
        .send({ verified: true, is_creator: true });

      expect(response.status).toBe(200);
      expect(response.body.verified).toBe(true);
      expect(response.body.is_creator).toBe(true);
    });

    it('should reject empty body', async () => {
      const { token } = await createTestUser({ username: 'empty_patch_auth' });
      const { user } = await createTestUser({ username: 'empty_patch_target' });

      const response = await request(getApp())
        .patch(`/api/admin/users/${user.id}`)
        .set('Authorization', `Bearer ${token}`)
        .set('x-admin-key', ADMIN_KEY)
        .send({});

      expect(response.status).toBe(400);
    });

    it('should return 404 for non-existent user', async () => {
      const { token } = await createTestUser({ username: 'patch_404_auth' });

      const response = await request(getApp())
        .patch('/api/admin/users/non-existent-id')
        .set('Authorization', `Bearer ${token}`)
        .set('x-admin-key', ADMIN_KEY)
        .send({ verified: true });

      expect(response.status).toBe(404);
    });

    it('should reject without admin key', async () => {
      const { token } = await createTestUser({ username: 'patch_no_admin' });
      const { user } = await createTestUser({ username: 'patch_no_admin_target' });

      const response = await request(getApp())
        .patch(`/api/admin/users/${user.id}`)
        .set('Authorization', `Bearer ${token}`)
        .send({ verified: true });

      expect(response.status).toBe(403);
    });
  });
});
