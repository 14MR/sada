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

describe('Moderation E2E', () => {
  beforeAll(async () => {
    await setupTestDB();
  });

  beforeEach(async () => {
    await clearDatabase();
  });

  describe('POST /moderation/report', () => {
    it('should report a user', async () => {
      const reporter = await createTestUser({ username: 'mod_reporter' });
      const reported = await createTestUser({ username: 'mod_reported' });

      const response = await request(getApp())
        .post('/moderation/report')
        .set('Authorization', `Bearer ${reporter.token}`)
        .send({ reportedUserId: reported.user.id, reason: 'harassment', description: 'Test report' });

      expect(response.status).toBe(201);
      expect(response.body.id).toBeDefined();
      expect(response.body.status).toBe('submitted');
    });

    it('should reject with missing reportedUserId', async () => {
      const { token } = await createTestUser();

      const response = await request(getApp())
        .post('/moderation/report')
        .set('Authorization', `Bearer ${token}`)
        .send({ reason: 'harassment' });

      expect(response.status).toBe(400);
    });

    it('should reject with missing reason', async () => {
      const reporter = await createTestUser();
      const reported = await createTestUser();

      const response = await request(getApp())
        .post('/moderation/report')
        .set('Authorization', `Bearer ${reporter.token}`)
        .send({ reportedUserId: reported.user.id });

      expect(response.status).toBe(400);
    });

    it('should reject invalid reason', async () => {
      const reporter = await createTestUser();
      const reported = await createTestUser();

      const response = await request(getApp())
        .post('/moderation/report')
        .set('Authorization', `Bearer ${reporter.token}`)
        .send({ reportedUserId: reported.user.id, reason: 'invalid_reason' });

      expect(response.status).toBe(400);
    });

    it('should not allow reporting yourself', async () => {
      const { user, token } = await createTestUser();

      const response = await request(getApp())
        .post('/moderation/report')
        .set('Authorization', `Bearer ${token}`)
        .send({ reportedUserId: user.id, reason: 'harassment' });

      expect(response.status).toBe(400);
      expect(response.body.error).toContain('yourself');
    });

    it('should require authentication', async () => {
      const response = await request(getApp())
        .post('/moderation/report')
        .send({ reportedUserId: 'some-id', reason: 'harassment' });

      expect(response.status).toBe(401);
    });
  });

  describe('POST /moderation/block', () => {
    it('should block a user', async () => {
      const blocker = await createTestUser({ username: 'mod_blocker' });
      const target = await createTestUser({ username: 'mod_blocked' });

      const response = await request(getApp())
        .post('/moderation/block')
        .set('Authorization', `Bearer ${blocker.token}`)
        .send({ blockedId: target.user.id });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });

    it('should reject with missing blockedId', async () => {
      const { token } = await createTestUser();

      const response = await request(getApp())
        .post('/moderation/block')
        .set('Authorization', `Bearer ${token}`)
        .send({});

      expect(response.status).toBe(400);
    });
  });

  describe('POST /moderation/unblock', () => {
    it('should unblock a user', async () => {
      const blocker = await createTestUser({ username: 'ub_mod1' });
      const target = await createTestUser({ username: 'ub_mod2' });

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

    it('should return 404 for non-blocked user', async () => {
      const user = await createTestUser();
      const other = await createTestUser();

      const response = await request(getApp())
        .post('/moderation/unblock')
        .set('Authorization', `Bearer ${user.token}`)
        .send({ blockedId: other.user.id });

      expect(response.status).toBe(404);
    });
  });

  describe('GET /moderation/blocked', () => {
    it('should list blocked users', async () => {
      const user = await createTestUser({ username: 'mod_lister' });
      const blocked1 = await createTestUser({ username: 'mod_b1' });
      const blocked2 = await createTestUser({ username: 'mod_b2' });

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
});
