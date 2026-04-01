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

describe('Report System E2E', () => {
  beforeAll(async () => {
    await setupTestDB();
  });

  beforeEach(async () => {
    await clearDatabase();
  });

  describe('POST /reports', () => {
    it('should submit a report for a user', async () => {
      const reporter = await createTestUser({ username: 'reporter1' });
      const reported = await createTestUser({ username: 'reported1' });

      const response = await request(getApp())
        .post('/api/reports')
        .set('Authorization', `Bearer ${reporter.token}`)
        .send({ reportedUserId: reported.user.id, reason: 'harassment', description: 'Test report' });

      expect(response.status).toBe(201);
      expect(response.body.id).toBeDefined();
      expect(response.body.status).toBe('pending');
      expect(response.body.reason).toBe('harassment');
    });

    it('should submit a report for a room', async () => {
      const reporter = await createTestUser({ username: 'reporter2' });
      const host = await createTestUser({ username: 'reported_host' });
      const room = await createTestRoom(host.user.id);

      const response = await request(getApp())
        .post('/api/reports')
        .set('Authorization', `Bearer ${reporter.token}`)
        .send({ reportedUserId: host.user.id, roomId: room.id, reason: 'spam' });

      expect(response.status).toBe(201);
      expect(response.body.room_id).toBe(room.id);
    });

    it('should reject without reportedUserId or roomId', async () => {
      const { token } = await createTestUser();

      const response = await request(getApp())
        .post('/api/reports')
        .set('Authorization', `Bearer ${token}`)
        .send({ reason: 'harassment' });

      expect(response.status).toBe(400);
    });

    it('should reject invalid reason', async () => {
      const reporter = await createTestUser();
      const reported = await createTestUser();

      const response = await request(getApp())
        .post('/api/reports')
        .set('Authorization', `Bearer ${reporter.token}`)
        .send({ reportedUserId: reported.user.id, reason: 'invalid' });

      expect(response.status).toBe(400);
    });

    it('should not allow reporting yourself', async () => {
      const { user, token } = await createTestUser();

      const response = await request(getApp())
        .post('/api/reports')
        .set('Authorization', `Bearer ${token}`)
        .send({ reportedUserId: user.id, reason: 'harassment' });

      expect(response.status).toBe(400);
      expect(response.body.error).toContain('yourself');
    });

    it('should require authentication', async () => {
      const response = await request(getApp())
        .post('/api/reports')
        .send({ reportedUserId: 'some-id', reason: 'harassment' });

      expect(response.status).toBe(401);
    });

    it('should auto-flag user with 3+ reports', async () => {
      const reported = await createTestUser({ username: 'flagged_user' });
      const { AppDataSource } = require('./testDb');
      const User = require('../../src/models/User').User;
      const userRepo = AppDataSource.getRepository(User);

      for (let i = 0; i < 3; i++) {
        const reporter = await createTestUser({ username: `flag_reporter_${i}` });
        await request(getApp())
          .post('/api/reports')
          .set('Authorization', `Bearer ${reporter.token}`)
          .send({ reportedUserId: reported.user.id, reason: 'spam' });
      }

      const updated = await userRepo.findOneBy({ id: reported.user.id });
      expect(updated.flagged).toBe(true);
    });

    it('should not flag user with fewer than 3 reports', async () => {
      const reported = await createTestUser({ username: 'unflagged_user' });
      const { AppDataSource } = require('./testDb');
      const User = require('../../src/models/User').User;
      const userRepo = AppDataSource.getRepository(User);

      for (let i = 0; i < 2; i++) {
        const reporter = await createTestUser({ username: `unflag_reporter_${i}` });
        await request(getApp())
          .post('/api/reports')
          .set('Authorization', `Bearer ${reporter.token}`)
          .send({ reportedUserId: reported.user.id, reason: 'spam' });
      }

      const updated = await userRepo.findOneBy({ id: reported.user.id });
      expect(updated.flagged).toBe(false);
    });
  });

  describe('GET /reports (admin)', () => {
    it('should list reports for admin', async () => {
      const adminUser = await createTestUser({ username: 'admin_list_auth' });
      const reporter = await createTestUser({ username: 'admin_reporter' });
      const reported = await createTestUser({ username: 'admin_reported' });

      await request(getApp())
        .post('/api/reports')
        .set('Authorization', `Bearer ${reporter.token}`)
        .send({ reportedUserId: reported.user.id, reason: 'harassment' });

      const response = await request(getApp())
        .get('/api/reports')
        .set('Authorization', `Bearer ${adminUser.token}`)
        .set('x-admin-key', process.env.ADMIN_KEY || 'test_admin_key');

      expect(response.status).toBe(200);
      expect(response.body.reports).toHaveLength(1);
      expect(response.body.total).toBe(1);
    });

    it('should filter reports by status', async () => {
      const adminUser = await createTestUser({ username: 'admin_filter_auth' });
      const reporter = await createTestUser({ username: 'filter_reporter' });
      const reported = await createTestUser({ username: 'filter_reported' });

      await request(getApp())
        .post('/api/reports')
        .set('Authorization', `Bearer ${reporter.token}`)
        .send({ reportedUserId: reported.user.id, reason: 'harassment' });

      const response = await request(getApp())
        .get('/api/reports?status=pending')
        .set('Authorization', `Bearer ${adminUser.token}`)
        .set('x-admin-key', process.env.ADMIN_KEY || 'test_admin_key');

      expect(response.status).toBe(200);
      expect(response.body.reports).toHaveLength(1);
    });

    it('should reject without admin key', async () => {
      const { token } = await createTestUser({ username: 'no_admin_key' });

      const response = await request(getApp())
        .get('/api/reports')
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(403);
    });

    it('should reject without authentication', async () => {
      const response = await request(getApp())
        .get('/api/reports')
        .set('x-admin-key', process.env.ADMIN_KEY || 'test_admin_key');

      expect(response.status).toBe(401);
    });
  });

  describe('PATCH /reports/:id (admin)', () => {
    it('should update report status to reviewed', async () => {
      const adminUser = await createTestUser({ username: 'admin_rev_auth' });
      const reporter = await createTestUser({ username: 'rev_reporter' });
      const reported = await createTestUser({ username: 'rev_reported' });

      const createRes = await request(getApp())
        .post('/api/reports')
        .set('Authorization', `Bearer ${reporter.token}`)
        .send({ reportedUserId: reported.user.id, reason: 'harassment' });

      const reportId = createRes.body.id;

      const response = await request(getApp())
        .patch(`/api/reports/${reportId}`)
        .set('Authorization', `Bearer ${adminUser.token}`)
        .set('x-admin-key', process.env.ADMIN_KEY || 'test_admin_key')
        .send({ status: 'reviewed' });

      expect(response.status).toBe(200);
      expect(response.body.status).toBe('reviewed');
      expect(response.body.reviewed_at).toBeDefined();
    });

    it('should update report status to dismissed', async () => {
      const adminUser = await createTestUser({ username: 'admin_dis_auth' });
      const reporter = await createTestUser({ username: 'dis_reporter' });
      const reported = await createTestUser({ username: 'dis_reported' });

      const createRes = await request(getApp())
        .post('/api/reports')
        .set('Authorization', `Bearer ${reporter.token}`)
        .send({ reportedUserId: reported.user.id, reason: 'harassment' });

      const response = await request(getApp())
        .patch(`/api/reports/${createRes.body.id}`)
        .set('Authorization', `Bearer ${adminUser.token}`)
        .set('x-admin-key', process.env.ADMIN_KEY || 'test_admin_key')
        .send({ status: 'dismissed' });

      expect(response.status).toBe(200);
      expect(response.body.status).toBe('dismissed');
    });

    it('should update report status to actioned', async () => {
      const adminUser = await createTestUser({ username: 'admin_act_auth' });
      const reporter = await createTestUser({ username: 'act_reporter' });
      const reported = await createTestUser({ username: 'act_reported' });

      const createRes = await request(getApp())
        .post('/api/reports')
        .set('Authorization', `Bearer ${reporter.token}`)
        .send({ reportedUserId: reported.user.id, reason: 'harassment' });

      const response = await request(getApp())
        .patch(`/api/reports/${createRes.body.id}`)
        .set('Authorization', `Bearer ${adminUser.token}`)
        .set('x-admin-key', process.env.ADMIN_KEY || 'test_admin_key')
        .send({ status: 'actioned' });

      expect(response.status).toBe(200);
      expect(response.body.status).toBe('actioned');
    });

    it('should reject invalid status', async () => {
      const adminUser = await createTestUser({ username: 'admin_inv_auth' });
      const reporter = await createTestUser({ username: 'inv_reporter' });
      const reported = await createTestUser({ username: 'inv_reported' });

      const createRes = await request(getApp())
        .post('/api/reports')
        .set('Authorization', `Bearer ${reporter.token}`)
        .send({ reportedUserId: reported.user.id, reason: 'harassment' });

      const response = await request(getApp())
        .patch(`/api/reports/${createRes.body.id}`)
        .set('Authorization', `Bearer ${adminUser.token}`)
        .set('x-admin-key', process.env.ADMIN_KEY || 'test_admin_key')
        .send({ status: 'invalid' });

      expect(response.status).toBe(400);
    });

    it('should return 404 for non-existent report', async () => {
      const adminUser = await createTestUser({ username: 'admin_404_auth' });

      const response = await request(getApp())
        .patch('/api/reports/nonexistent')
        .set('Authorization', `Bearer ${adminUser.token}`)
        .set('x-admin-key', process.env.ADMIN_KEY || 'test_admin_key')
        .send({ status: 'reviewed' });

      expect(response.status).toBe(404);
    });

    it('should reject non-admin', async () => {
      const { token } = await createTestUser({ username: 'non_admin' });

      const response = await request(getApp())
        .patch('/api/reports/some-id')
        .set('Authorization', `Bearer ${token}`)
        .send({ status: 'reviewed' });

      expect(response.status).toBe(403);
    });
  });
});
