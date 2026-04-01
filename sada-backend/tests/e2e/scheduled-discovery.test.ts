import request from 'supertest';
import { setupTestDB, clearDatabase, createTestUser, createTestCategory, createTestRoom, getApp } from './helpers';
import { AppDataSource } from '../../src/config/database';
import { Room } from '../../src/models/Room';
import { RoomParticipant } from '../../src/models/RoomParticipant';
import { Follow } from '../../src/models/Follow';
import { Notification, NotificationType } from '../../src/models/Notification';

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

describe('Scheduled Rooms & Discovery', () => {
  beforeAll(async () => {
    await setupTestDB();
  });

  beforeEach(async () => {
    await clearDatabase();
  });

  // ── Scheduled Rooms ──────────────────────────────────────────────

  describe('POST /rooms/schedule — Schedule a room', () => {
    it('should create a scheduled room with valid data', async () => {
      const { user, token } = await createTestUser();
      const category = await createTestCategory();
      const futureDate = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();

      const res = await request(getApp())
        .post('/api/rooms/schedule')
        .set('Authorization', `Bearer ${token}`)
        .send({
          title: 'Scheduled Talk',
          description: 'A future room',
          categoryId: category.id,
          scheduledAt: futureDate,
        });

      expect(res.status).toBe(201);
      expect(res.body.title).toBe('Scheduled Talk');
      expect(res.body.description).toBe('A future room');
      expect(res.body.categoryId).toBe(category.id);
      expect(res.body.status).toBe('scheduled');
      expect(res.body.scheduledAt).toBeDefined();
      expect(res.body.host_id).toBe(user.id);
    });

    it('should reject missing required fields', async () => {
      const { token } = await createTestUser();

      const res = await request(getApp())
        .post('/api/rooms/schedule')
        .set('Authorization', `Bearer ${token}`)
        .send({ title: 'No description or category' });

      expect(res.status).toBe(400);
    });

    it('should reject past scheduledAt', async () => {
      const { token } = await createTestUser();
      const category = await createTestCategory();
      const pastDate = new Date(Date.now() - 60 * 60 * 1000).toISOString();

      const res = await request(getApp())
        .post('/api/rooms/schedule')
        .set('Authorization', `Bearer ${token}`)
        .send({
          title: 'Past Room',
          description: 'Should fail',
          categoryId: category.id,
          scheduledAt: pastDate,
        });

      expect(res.status).toBe(400);
    });

    it('should reject invalid categoryId', async () => {
      const { token } = await createTestUser();
      const futureDate = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();

      const res = await request(getApp())
        .post('/api/rooms/schedule')
        .set('Authorization', `Bearer ${token}`)
        .send({
          title: 'Bad Category',
          description: 'Should fail',
          categoryId: 'non-existent-uuid',
          scheduledAt: futureDate,
        });

      expect(res.status).toBe(400);
      expect(res.body.error).toContain('Category');
    });

    it('should require authentication', async () => {
      const category = await createTestCategory();
      const futureDate = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();

      const res = await request(getApp())
        .post('/api/rooms/schedule')
        .send({
          title: 'No Auth',
          description: 'Should fail',
          categoryId: category.id,
          scheduledAt: futureDate,
        });

      expect(res.status).toBe(401);
    });
  });

  describe('GET /rooms/scheduled — List scheduled rooms', () => {
    it('should return only scheduled rooms', async () => {
      const { user } = await createTestUser();
      const category = await createTestCategory();
      const futureDate = new Date(Date.now() + 24 * 60 * 60 * 1000);

      await createTestRoom(user.id, { title: 'Scheduled 1', status: 'scheduled', scheduledAt: futureDate, categoryId: category.id });
      await createTestRoom(user.id, { title: 'Scheduled 2', status: 'scheduled', scheduledAt: new Date(Date.now() + 48 * 60 * 60 * 1000), categoryId: category.id });
      await createTestRoom(user.id, { title: 'Live Room', status: 'live' });

      const { token } = await createTestUser();
      const res = await request(getApp())
        .get('/api/rooms/scheduled')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.rooms).toHaveLength(2);
      expect(res.body.rooms[0].title).toBe('Scheduled 1');
      expect(res.body.total).toBe(2);
    });

    it('should filter by category', async () => {
      const { user } = await createTestUser();
      const cat1 = await createTestCategory({ slug: 'music' });
      const cat2 = await createTestCategory({ slug: 'talk' });
      const futureDate = new Date(Date.now() + 24 * 60 * 60 * 1000);

      await createTestRoom(user.id, { title: 'Music Room', status: 'scheduled', scheduledAt: futureDate, categoryId: cat1.id });
      await createTestRoom(user.id, { title: 'Talk Room', status: 'scheduled', scheduledAt: futureDate, categoryId: cat2.id });

      const { token } = await createTestUser();
      const res = await request(getApp())
        .get(`/api/rooms/scheduled?category=${cat1.slug}`)
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.rooms).toHaveLength(1);
      expect(res.body.rooms[0].title).toBe('Music Room');
    });

    it('should paginate results', async () => {
      const { user } = await createTestUser();
      const category = await createTestCategory();
      const futureDate = new Date(Date.now() + 24 * 60 * 60 * 1000);

      for (let i = 0; i < 5; i++) {
        await createTestRoom(user.id, { title: `Room ${i}`, status: 'scheduled', scheduledAt: new Date(futureDate.getTime() + i * 3600000), categoryId: category.id });
      }

      const { token } = await createTestUser();
      const page1 = await request(getApp())
        .get('/api/rooms/scheduled?limit=2&offset=0')
        .set('Authorization', `Bearer ${token}`);

      expect(page1.status).toBe(200);
      expect(page1.body.rooms).toHaveLength(2);
      expect(page1.body.total).toBe(5);

      const page2 = await request(getApp())
        .get('/api/rooms/scheduled?limit=2&offset=2')
        .set('Authorization', `Bearer ${token}`);

      expect(page2.status).toBe(200);
      expect(page2.body.rooms).toHaveLength(2);
    });

    it('should return empty when no scheduled rooms', async () => {
      const { token } = await createTestUser();

      const res = await request(getApp())
        .get('/api/rooms/scheduled')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.rooms).toHaveLength(0);
      expect(res.body.total).toBe(0);
    });
  });

  describe('POST /rooms/:id/start — Start a scheduled room', () => {
    it('should start a scheduled room (host only)', async () => {
      const { user, token } = await createTestUser();
      const category = await createTestCategory();
      const futureDate = new Date(Date.now() + 24 * 60 * 60 * 1000);

      const room = await createTestRoom(user.id, {
        title: 'To Start',
        status: 'scheduled',
        scheduledAt: futureDate,
        categoryId: category.id,
      });

      const res = await request(getApp())
        .post(`/api/rooms/${room.id}/start`)
        .set('Authorization', `Bearer ${token}`)
        .send({});

      expect(res.status).toBe(200);
      expect(res.body.status).toBe('live');
      expect(res.body.audio).toBeDefined();

      // Verify DB status changed
      const updated = await AppDataSource.getRepository(Room).findOneBy({ id: room.id });
      expect(updated!.status).toBe('live');
    });

    it('should reject non-host from starting', async () => {
      const host = await createTestUser();
      const other = await createTestUser();
      const futureDate = new Date(Date.now() + 24 * 60 * 60 * 1000);

      const room = await createTestRoom(host.user.id, { status: 'scheduled', scheduledAt: futureDate });

      const res = await request(getApp())
        .post(`/api/rooms/${room.id}/start`)
        .set('Authorization', `Bearer ${other.token}`)
        .send({});

      expect(res.status).toBe(400);
      expect(res.body.error).toContain('host');
    });

    it('should reject starting a non-scheduled room', async () => {
      const { user, token } = await createTestUser();
      const room = await createTestRoom(user.id, { status: 'live' });

      const res = await request(getApp())
        .post(`/api/rooms/${room.id}/start`)
        .set('Authorization', `Bearer ${token}`)
        .send({});

      expect(res.status).toBe(400);
      expect(res.body.error).toContain('scheduled');
    });

    it('should return 404 for non-existent room', async () => {
      const { token } = await createTestUser();

      const res = await request(getApp())
        .post('/api/rooms/non-existent-id/start')
        .set('Authorization', `Bearer ${token}`)
        .send({});

      expect(res.status).toBe(404);
    });

    it('should require authentication', async () => {
      const host = await createTestUser();
      const futureDate = new Date(Date.now() + 24 * 60 * 60 * 1000);
      const room = await createTestRoom(host.user.id, { status: 'scheduled', scheduledAt: futureDate });

      const res = await request(getApp())
        .post(`/api/rooms/${room.id}/start`);

      expect(res.status).toBe(401);
    });
  });

  // ── Trending / Discovery ─────────────────────────────────────────

  describe('GET /rooms/trending — Trending rooms', () => {
    it('should return live rooms sorted by trending score', async () => {
      const { user } = await createTestUser();
      const category = await createTestCategory();

      // Room with high listener count
      await createTestRoom(user.id, { title: 'Popular Room', status: 'live', listener_count: 100, categoryId: category.id });
      // Room with low listener count
      await createTestRoom(user.id, { title: 'Quiet Room', status: 'live', listener_count: 1 });
      // Ended room should not appear
      await createTestRoom(user.id, { title: 'Ended Room', status: 'ended', listener_count: 500 });

      const { token } = await createTestUser();
      const res = await request(getApp())
        .get('/api/rooms/trending')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body).toHaveLength(2);
      expect(res.body[0].title).toBe('Popular Room');
    });

    it('should paginate trending results', async () => {
      const { user } = await createTestUser();

      for (let i = 0; i < 5; i++) {
        await createTestRoom(user.id, { title: `Room ${i}`, status: 'live', listener_count: 10 - i });
      }

      const { token } = await createTestUser();
      const res = await request(getApp())
        .get('/api/rooms/trending?limit=2&offset=0')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body).toHaveLength(2);
    });

    it('should return empty array when no live rooms', async () => {
      const { token } = await createTestUser();

      const res = await request(getApp())
        .get('/api/rooms/trending')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body).toHaveLength(0);
    });
  });

  describe('GET /rooms/categories/:slug — Rooms by category', () => {
    it('should return live rooms for a category', async () => {
      const { user } = await createTestUser();
      const cat1 = await createTestCategory({ slug: 'music' });
      const cat2 = await createTestCategory({ slug: 'tech' });

      await createTestRoom(user.id, { title: 'Music Room 1', status: 'live', categoryId: cat1.id });
      await createTestRoom(user.id, { title: 'Music Room 2', status: 'live', categoryId: cat1.id });
      await createTestRoom(user.id, { title: 'Tech Room', status: 'live', categoryId: cat2.id });

      const { token } = await createTestUser();
      const res = await request(getApp())
        .get(`/api/rooms/categories/${cat1.slug}`)
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.rooms).toHaveLength(2);
      expect(res.body.total).toBe(2);
    });

    it('should paginate category results', async () => {
      const { user } = await createTestUser();
      const cat = await createTestCategory({ slug: 'sports' });

      for (let i = 0; i < 5; i++) {
        await createTestRoom(user.id, { title: `Sports ${i}`, status: 'live', categoryId: cat.id });
      }

      const { token } = await createTestUser();
      const res = await request(getApp())
        .get(`/api/rooms/categories/${cat.slug}?limit=2&offset=0`)
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.rooms).toHaveLength(2);
      expect(res.body.total).toBe(5);
    });

    it('should return empty for category with no live rooms', async () => {
      const cat = await createTestCategory({ slug: 'empty-cat' });
      const { token } = await createTestUser();

      const res = await request(getApp())
        .get(`/api/rooms/categories/${cat.slug}`)
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.rooms).toHaveLength(0);
      expect(res.body.total).toBe(0);
    });
  });

  // ── Pagination on existing endpoints ─────────────────────────────

  describe('GET /rooms — Pagination support', () => {
    it('should support limit and offset parameters', async () => {
      const { user, token } = await createTestUser();

      for (let i = 0; i < 5; i++) {
        await createTestRoom(user.id, { title: `Room ${i}`, status: 'live' });
      }

      const res = await request(getApp())
        .get('/api/rooms/?limit=2&offset=0')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body).toHaveLength(2);
    });
  });

  // ── Notification on scheduled room start ─────────────────────────

  describe('Notifications on scheduled room start', () => {
    it('should create notifications for followers when a scheduled room starts', async () => {
      const host = await createTestUser({ username: 'host_notif' });
      const follower1 = await createTestUser({ username: 'follower1' });
      const follower2 = await createTestUser({ username: 'follower2' });
      const category = await createTestCategory();

      // Create follow relationships
      const followRepo = AppDataSource.getRepository(Follow);
      await followRepo.save({ follower: follower1.user, following: host.user });
      await followRepo.save({ follower: follower2.user, following: host.user });

      const futureDate = new Date(Date.now() + 24 * 60 * 60 * 1000);
      const room = await createTestRoom(host.user.id, {
        title: 'Notif Room',
        status: 'scheduled',
        scheduledAt: futureDate,
        categoryId: category.id,
      });

      // Start the room
      const res = await request(getApp())
        .post(`/api/rooms/${room.id}/start`)
        .set('Authorization', `Bearer ${host.token}`)
        .send({});

      expect(res.status).toBe(200);

      // Wait for async notifications
      await new Promise((r) => setTimeout(r, 500));

      const notifRepo = AppDataSource.getRepository(Notification);
      const notifs = await notifRepo.find({ where: { type: NotificationType.ROOM_STARTED } });
      expect(notifs.length).toBeGreaterThanOrEqual(2);
    });
  });
});
