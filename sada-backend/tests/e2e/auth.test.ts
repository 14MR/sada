import request from 'supertest';
import { setupTestDB, clearDatabase, createTestUser, getApp } from './helpers';
import { AppDataSource } from '../../src/config/database';
import { User } from '../../src/models/User';
import { AuthService } from '../../src/services/auth.service';

// Mock database to use in-memory SQLite
jest.mock('../../src/config/database', () => require('./testDb'));

// Mock AudioService to avoid network calls
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

describe('Auth E2E', () => {
  beforeAll(async () => {
    await setupTestDB();
  });

  beforeEach(async () => {
    await clearDatabase();
  });

  describe('GET /health', () => {
    it('should return 200 with status ok', async () => {
      const res = await request(getApp()).get('/health');
      expect(res.status).toBe(200);
      expect(res.body.status).toBe('ok');
    });
  });

  describe('POST /auth/signin', () => {
    it('should create a new user on first sign-in', async () => {
      const response = await request(getApp())
        .post('/api/auth/signin')
        .send({ identityToken: 'test-apple-id-001', fullName: 'John Doe' });

      expect(response.status).toBe(200);
      expect(response.body.user).toBeDefined();
      expect(response.body.user.display_name).toBe('John Doe');
      expect(response.body.token).toBeDefined();

      const users = await AppDataSource.getRepository(User).find();
      expect(users).toHaveLength(1);
      expect(users[0].apple_id).toBe('test-apple-id-001');
    });

    it('should login existing user on subsequent sign-in', async () => {
      const first = await request(getApp())
        .post('/api/auth/signin')
        .send({ identityToken: 'test-apple-id-002', fullName: 'First Name' });

      expect(first.status).toBe(200);
      const userId = first.body.user.id;

      const second = await request(getApp())
        .post('/api/auth/signin')
        .send({ identityToken: 'test-apple-id-002', fullName: 'Updated Name' });

      expect(second.status).toBe(200);
      expect(second.body.user.id).toBe(userId);
      expect(second.body.user.display_name).toBe('First Name');
      expect(second.body.token).toBeDefined();

      const users = await AppDataSource.getRepository(User).find();
      expect(users).toHaveLength(1);
    });

    it('should recover if concurrent first sign-in wins the user insert race', async () => {
      const repository = AppDataSource.getRepository(User);
      const winningUser = await createTestUser({ apple_id: 'raced-apple-id' });
      const duplicateError = Object.assign(new Error('UNIQUE constraint failed: users.apple_id'), {
        code: 'SQLITE_CONSTRAINT',
      });

      const findSpy = jest.spyOn(repository, 'findOneBy')
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce(winningUser.user);
      const saveSpy = jest.spyOn(repository, 'save').mockRejectedValueOnce(duplicateError);

      try {
        const user = await AuthService.mapUser('raced-apple-id', undefined, 'Raced User');

        expect(user.id).toBe(winningUser.user.id);
        expect(findSpy).toHaveBeenCalledTimes(2);
        expect(saveSpy).toHaveBeenCalledTimes(1);
      } finally {
        findSpy.mockRestore();
        saveSpy.mockRestore();
      }
    });

    it('should return 400 if identityToken is missing', async () => {
      const response = await request(getApp())
        .post('/api/auth/signin')
        .send({ fullName: 'No Token' });

      expect(response.status).toBe(400);
      expect(response.body.error).toContain('identityToken');
    });

    it('should return 403 for banned users', async () => {
      await createTestUser({ banned: true, apple_id: 'banned-apple-id' });

      const response = await request(getApp())
        .post('/api/auth/signin')
        .send({ identityToken: 'banned-apple-id' });

      expect(response.status).toBe(403);
      expect(response.body.error).toContain('banned');
    });
  });

  describe('Protected routes authentication', () => {
    it('should return 401 when accessing protected route without token', async () => {
      const response = await request(getApp()).get('/api/creator/dashboard');
      expect(response.status).toBe(401);
    });

    it('should return 401 with invalid token', async () => {
      const response = await request(getApp())
        .get('/api/creator/dashboard')
        .set('Authorization', 'Bearer invalid_token_here');

      expect(response.status).toBe(401);
    });

    it('should return data with valid token', async () => {
      const { user, token } = await createTestUser({ is_creator: true });

      const response = await request(getApp())
        .get('/api/creator/dashboard')
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(200);
      expect(response.body.user).toBeDefined();
      expect(response.body.user.id).toBe(user.id);
    });
  });
});
