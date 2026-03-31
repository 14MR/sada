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

describe('Notification Preferences E2E', () => {
  beforeAll(async () => {
    await setupTestDB();
  });

  beforeEach(async () => {
    await clearDatabase();
  });

  describe('GET /users/notification-preferences', () => {
    it('should return all notification preferences for a user', async () => {
      const { token } = await createTestUser();

      const response = await request(getApp())
        .get('/users/notification-preferences')
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(200);
      expect(response.body).toHaveLength(6); // All notification types
      expect(response.body[0]).toHaveProperty('type');
      expect(response.body[0]).toHaveProperty('enabled');
    });

    it('should require authentication', async () => {
      const response = await request(getApp())
        .get('/users/notification-preferences');

      expect(response.status).toBe(401);
    });
  });

  describe('PUT /users/notification-preferences', () => {
    it('should bulk update notification preferences', async () => {
      const { token } = await createTestUser();

      const response = await request(getApp())
        .put('/users/notification-preferences')
        .set('Authorization', `Bearer ${token}`)
        .send({
          preferences: [
            { type: 'room_started', enabled: false },
            { type: 'new_follower', enabled: false },
          ],
        });

      expect(response.status).toBe(200);
      const disabled = response.body.filter((p: any) => !p.enabled);
      expect(disabled.length).toBeGreaterThanOrEqual(2);
    });

    it('should reject empty preferences array', async () => {
      const { token } = await createTestUser();

      const response = await request(getApp())
        .put('/users/notification-preferences')
        .set('Authorization', `Bearer ${token}`)
        .send({ preferences: [] });

      expect(response.status).toBe(400);
    });

    it('should reject invalid notification type', async () => {
      const { token } = await createTestUser();

      const response = await request(getApp())
        .put('/users/notification-preferences')
        .set('Authorization', `Bearer ${token}`)
        .send({
          preferences: [{ type: 'invalid_type', enabled: true }],
        });

      expect(response.status).toBe(400);
    });

    it('should require authentication', async () => {
      const response = await request(getApp())
        .put('/users/notification-preferences')
        .send({ preferences: [{ type: 'room_started', enabled: false }] });

      expect(response.status).toBe(401);
    });

    it('should persist preference changes', async () => {
      const { token } = await createTestUser();

      // Update
      await request(getApp())
        .put('/users/notification-preferences')
        .set('Authorization', `Bearer ${token}`)
        .send({
          preferences: [{ type: 'gem_received', enabled: false }],
        });

      // Verify
      const response = await request(getApp())
        .get('/users/notification-preferences')
        .set('Authorization', `Bearer ${token}`);

      const gemPref = response.body.find((p: any) => p.type === 'gem_received');
      expect(gemPref.enabled).toBe(false);
    });
  });
});
