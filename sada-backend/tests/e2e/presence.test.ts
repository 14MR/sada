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

describe('User Presence E2E', () => {
  beforeAll(async () => {
    await setupTestDB();
  });

  beforeEach(async () => {
    await clearDatabase();
  });

  describe('POST /users/presence', () => {
    it('should update own presence to online', async () => {
      const { token } = await createTestUser({ username: 'pres_on' });

      const response = await request(getApp())
        .post('/users/presence')
        .set('Authorization', `Bearer ${token}`)
        .send({ status: 'online' });

      expect(response.status).toBe(200);
      expect(response.body.status).toBe('online');
      expect(response.body.last_seen_at).toBeDefined();
    });

    it('should update presence with current room', async () => {
      const { user, token } = await createTestUser({ username: 'pres_room' });
      const room = await createTestRoom(user.id);

      const response = await request(getApp())
        .post('/users/presence')
        .set('Authorization', `Bearer ${token}`)
        .send({ status: 'online', currentRoomId: room.id });

      expect(response.status).toBe(200);
      expect(response.body.status).toBe('online');
      expect(response.body.current_room_id).toBe(room.id);
    });

    it('should update presence to away', async () => {
      const { token } = await createTestUser({ username: 'pres_away' });

      const response = await request(getApp())
        .post('/users/presence')
        .set('Authorization', `Bearer ${token}`)
        .send({ status: 'away' });

      expect(response.status).toBe(200);
      expect(response.body.status).toBe('away');
    });

    it('should update presence to offline', async () => {
      const { token } = await createTestUser({ username: 'pres_off' });

      // First go online
      await request(getApp())
        .post('/users/presence')
        .set('Authorization', `Bearer ${token}`)
        .send({ status: 'online' });

      // Then go offline
      const response = await request(getApp())
        .post('/users/presence')
        .set('Authorization', `Bearer ${token}`)
        .send({ status: 'offline' });

      expect(response.status).toBe(200);
      expect(response.body.status).toBe('offline');
    });

    it('should reject invalid status', async () => {
      const { token } = await createTestUser({ username: 'pres_inv' });

      const response = await request(getApp())
        .post('/users/presence')
        .set('Authorization', `Bearer ${token}`)
        .send({ status: 'invalid' });

      expect(response.status).toBe(400);
    });

    it('should require authentication', async () => {
      const response = await request(getApp())
        .post('/users/presence')
        .send({ status: 'online' });

      expect(response.status).toBe(401);
    });

    it('should upsert presence (update existing)', async () => {
      const { token } = await createTestUser({ username: 'pres_upsert' });

      // Create
      await request(getApp())
        .post('/users/presence')
        .set('Authorization', `Bearer ${token}`)
        .send({ status: 'online' });

      // Update
      const response = await request(getApp())
        .post('/users/presence')
        .set('Authorization', `Bearer ${token}`)
        .send({ status: 'away' });

      expect(response.status).toBe(200);
      expect(response.body.status).toBe('away');
    });
  });

  describe('GET /users/:id/presence', () => {
    it('should return offline for user with no presence record', async () => {
      const { token } = await createTestUser({ username: 'pres_getter' });
      const { user } = await createTestUser({ username: 'pres_never' });

      const response = await request(getApp())
        .get(`/users/${user.id}/presence`)
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(200);
      expect(response.body.status).toBe('offline');
      expect(response.body.user_id).toBe(user.id);
    });

    it('should return online presence', async () => {
      const { token } = await createTestUser({ username: 'pres_online_getter' });
      const { user, token: targetToken } = await createTestUser({ username: 'pres_online_target' });

      // Set target online
      await request(getApp())
        .post('/users/presence')
        .set('Authorization', `Bearer ${targetToken}`)
        .send({ status: 'online' });

      const response = await request(getApp())
        .get(`/users/${user.id}/presence`)
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(200);
      expect(response.body.status).toBe('online');
    });

    it('should return current room id when set', async () => {
      const { token } = await createTestUser({ username: 'pres_room_getter' });
      const { user, token: targetToken } = await createTestUser({ username: 'pres_room_target' });
      const room = await createTestRoom(user.id);

      await request(getApp())
        .post('/users/presence')
        .set('Authorization', `Bearer ${targetToken}`)
        .send({ status: 'online', currentRoomId: room.id });

      const response = await request(getApp())
        .get(`/users/${user.id}/presence`)
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(200);
      expect(response.body.current_room_id).toBe(room.id);
    });

    it('should require authentication', async () => {
      const response = await request(getApp())
        .get('/users/some-id/presence');

      expect(response.status).toBe(401);
    });
  });
});
