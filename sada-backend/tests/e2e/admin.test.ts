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
    it('should return dashboard stats', async () => {
      const { token } = await createTestUser({ username: 'stat_auth' });
      await createTestUser({ username: 'stat_user1' });
      await createTestUser({ username: 'stat_user2' });

      const response = await request(getApp())
        .get('/api/admin/stats')
        .set('Authorization', `Bearer ${token}`)
        .set('x-admin-key', ADMIN_KEY);

      expect(response.status).toBe(200);
      expect(response.body.totalUsers).toBeGreaterThanOrEqual(2);
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
    it('should list users', async () => {
      const { token } = await createTestUser({ username: 'admin_auth' });
      await createTestUser({ username: 'admin_u1' });
      await createTestUser({ username: 'admin_u2' });

      const response = await request(getApp())
        .get('/api/admin/users')
        .set('Authorization', `Bearer ${token}`)
        .set('x-admin-key', ADMIN_KEY);

      expect(response.status).toBe(200);
      expect(response.body.length ?? response.body.users?.length ?? 0).toBeGreaterThanOrEqual(2);
    });
  });

  describe('POST /admin/users/:id/ban', () => {
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

    it('should return 404 for non-existent user', async () => {
      const { token } = await createTestUser({ username: 'ban_404_auth' });

      const response = await request(getApp())
        .post('/api/admin/users/non-existent-id/ban')
        .set('Authorization', `Bearer ${token}`)
        .set('x-admin-key', ADMIN_KEY);

      expect(response.status).toBe(404);
    });
  });

  describe('POST /admin/users/:id/unban', () => {
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
  });
});
