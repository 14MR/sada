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

describe('Notification E2E', () => {
  beforeAll(async () => {
    await setupTestDB();
  });

  beforeEach(async () => {
    await clearDatabase();
  });

  describe('GET /notifications', () => {
    it('should return notifications list for a user', async () => {
      const { user, token } = await createTestUser({ username: 'notif_user' });

      const response = await request(getApp())
        .get(`/notifications?userId=${user.id}`)
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(200);
      expect(Array.isArray(response.body)).toBe(true);
    });

    it('should return 400 when userId is missing', async () => {
      const { token } = await createTestUser();

      const response = await request(getApp())
        .get('/notifications')
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(400);
    });
  });

  describe('PATCH /notifications/:id/read', () => {
    it('should require userId in body', async () => {
      const { token } = await createTestUser();

      const response = await request(getApp())
        .patch('/notifications/some-id/read')
        .set('Authorization', `Bearer ${token}`)
        .send({});

      expect(response.status).toBe(400);
    });
  });

  describe('POST /notifications/read-all', () => {
    it('should require userId in body', async () => {
      const { token } = await createTestUser();

      const response = await request(getApp())
        .post('/notifications/read-all')
        .set('Authorization', `Bearer ${token}`)
        .send({});

      expect(response.status).toBe(400);
    });
  });

  describe('GET /notifications/unread-count', () => {
    it('should return unread count for a user', async () => {
      const { user, token } = await createTestUser({ username: 'unread_user' });

      const response = await request(getApp())
        .get(`/notifications/unread-count?userId=${user.id}`)
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(200);
      expect(response.body.count).toBeDefined();
    });

    it('should return 400 when userId is missing', async () => {
      const { token } = await createTestUser();

      const response = await request(getApp())
        .get('/notifications/unread-count')
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(400);
    });
  });
});
