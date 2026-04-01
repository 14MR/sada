import request from 'supertest';
import { setupTestDB, clearDatabase, createTestUser, createTestCategory, createTestRoom, getApp } from './helpers';

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

describe('Category E2E', () => {
  beforeAll(async () => {
    await setupTestDB();
  });

  beforeEach(async () => {
    await clearDatabase();
  });

  describe('GET /categories', () => {
    it('should return empty list when no categories', async () => {
      const { token } = await createTestUser();
      const response = await request(getApp())
        .get('/api/categories')
        .set('Authorization', `Bearer ${token}`);
      expect(response.status).toBe(200);
      expect(response.body).toEqual([]);
    });

    it('should list categories', async () => {
      const { token } = await createTestUser();
      await createTestCategory({ name: 'Music', slug: 'music' });
      await createTestCategory({ name: 'Tech', slug: 'tech' });

      const response = await request(getApp())
        .get('/api/categories')
        .set('Authorization', `Bearer ${token}`);
      expect(response.status).toBe(200);
      expect(response.body).toHaveLength(2);
    });
  });

  describe('GET /categories/:slug/rooms', () => {
    it('should return rooms for a category', async () => {
      const { user, token } = await createTestUser();
      const category = await createTestCategory({ name: 'Music', slug: 'music' });
      await createTestRoom(user.id, { categoryId: category.id, title: 'Jazz Room' });

      const response = await request(getApp())
        .get('/api/categories/music/rooms')
        .set('Authorization', `Bearer ${token}`);
      expect(response.status).toBe(200);
      expect(response.body).toHaveLength(1);
      expect(response.body[0].title).toBe('Jazz Room');
    });

    it('should return 404 for unknown slug', async () => {
      const { token } = await createTestUser();
      const response = await request(getApp())
        .get('/api/categories/nonexistent/rooms')
        .set('Authorization', `Bearer ${token}`);
      expect(response.status).toBe(404);
    });
  });
});
