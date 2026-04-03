/**
 * Moderation E2E Tests — Consolidated
 *
 * Merged from: moderation.test.ts + report-system.test.ts
 * Unique tests: auto-flag, report lifecycle (admin CRUD)
 */
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
    process.env.ADMIN_KEY = 'test-admin-key';
    await setupTestDB();
  });

  beforeEach(async () => {
    await clearDatabase();
  });

  // ── Report Submission ──────────────────────────────────────────

  describe('Report submission', () => {
    it('should report a user', async () => {
      const reporter = await createTestUser({ username: 'rep_reporter' });
      const reported = await createTestUser({ username: 'rep_reported' });

      const response = await request(getApp())
        .post('/api/reports')
        .set('Authorization', `Bearer ${reporter.token}`)
        .send({ reportedUserId: reported.user.id, reason: 'harassment', description: 'Test report' });

      expect(response.status).toBe(201);
      expect(response.body.id).toBeDefined();
    });

    it('should report a room', async () => {
      const reporter = await createTestUser({ username: 'room_reporter' });
      const host = await createTestUser({ username: 'room_report_host' });
      const { createTestRoom } = require('./helpers');
      const room = await createTestRoom(host.user.id);

      const response = await request(getApp())
        .post('/api/reports')
        .set('Authorization', `Bearer ${reporter.token}`)
        .send({ reportedUserId: host.user.id, roomId: room.id, reason: 'other' });

      expect(response.status).toBe(201);
    });

    it('should reject without reportedUserId or roomId', async () => {
      const { token } = await createTestUser();

      const response = await request(getApp())
        .post('/api/reports')
        .set('Authorization', `Bearer ${token}`)
        .send({ reason: 'harassment' });

      expect(response.status).toBe(400);
    });

    it('should not allow reporting yourself', async () => {
      const { user, token } = await createTestUser();

      const response = await request(getApp())
        .post('/api/reports')
        .set('Authorization', `Bearer ${token}`)
        .send({ reportedUserId: user.id, reason: 'harassment' });

      expect(response.status).toBe(400);
    });

    it('should auto-flag user with 3+ reports', async () => {
      const reported = await createTestUser({ username: 'flagged_user' });
      const { AppDataSource } = require('./testDb');
      const User = require('../../src/models/User').User;

      for (let i = 0; i < 3; i++) {
        const reporter = await createTestUser({ username: `flag_reporter_${i}` });
        await request(getApp())
          .post('/api/reports')
          .set('Authorization', `Bearer ${reporter.token}`)
          .send({ reportedUserId: reported.user.id, reason: 'spam' });
      }

      const updated = await AppDataSource.getRepository(User).findOneBy({ id: reported.user.id });
      expect(updated.flagged).toBe(true);
    });

    it('should NOT flag user with fewer than 3 reports', async () => {
      const reported = await createTestUser({ username: 'unflagged_user' });
      const { AppDataSource } = require('./testDb');
      const User = require('../../src/models/User').User;

      for (let i = 0; i < 2; i++) {
        const reporter = await createTestUser({ username: `unflag_reporter_${i}` });
        await request(getApp())
          .post('/api/reports')
          .set('Authorization', `Bearer ${reporter.token}`)
          .send({ reportedUserId: reported.user.id, reason: 'spam' });
      }

      const updated = await AppDataSource.getRepository(User).findOneBy({ id: reported.user.id });
      expect(updated.flagged).toBe(false);
    });

    it('should require authentication', async () => {
      const response = await request(getApp())
        .post('/api/reports')
        .send({ reportedUserId: 'some-id', reason: 'harassment' });

      expect(response.status).toBe(401);
    });
  });

  // ── Admin Report Management ────────────────────────────────────

  describe('Admin report management', () => {
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
        .set('x-admin-key', process.env.ADMIN_KEY || 'test-admin-key');

      expect(response.status).toBe(200);
      expect(response.body.reports).toHaveLength(1);
    });

    it('should update report status', async () => {
      const adminUser = await createTestUser({ username: 'admin_update_auth' });
      const reporter = await createTestUser({ username: 'update_reporter' });
      const reported = await createTestUser({ username: 'update_reported' });

      const createRes = await request(getApp())
        .post('/api/reports')
        .set('Authorization', `Bearer ${reporter.token}`)
        .send({ reportedUserId: reported.user.id, reason: 'harassment' });

      const response = await request(getApp())
        .patch(`/api/reports/${createRes.body.id}`)
        .set('Authorization', `Bearer ${adminUser.token}`)
        .set('x-admin-key', process.env.ADMIN_KEY || 'test-admin-key')
        .send({ status: 'reviewed' });

      expect(response.status).toBe(200);
      expect(response.body.status).toBe('reviewed');
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
        .set('x-admin-key', process.env.ADMIN_KEY || 'test-admin-key')
        .send({ status: 'invalid' });

      expect(response.status).toBe(400);
    });

    it('should return 404 for non-existent report', async () => {
      const adminUser = await createTestUser({ username: 'admin_404_auth' });

      const response = await request(getApp())
        .patch('/api/reports/nonexistent')
        .set('Authorization', `Bearer ${adminUser.token}`)
        .set('x-admin-key', process.env.ADMIN_KEY || 'test-admin-key')
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
