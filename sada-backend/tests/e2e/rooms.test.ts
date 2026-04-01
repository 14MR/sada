import request from 'supertest';
import { setupTestDB, clearDatabase, createTestUser, createTestCategory, createTestRoom, getApp } from './helpers';
import { AppDataSource } from '../../src/config/database';
import { Room } from '../../src/models/Room';
import { RoomParticipant } from '../../src/models/RoomParticipant';

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

describe('Rooms E2E', () => {
  beforeAll(async () => {
    await setupTestDB();
  });

  beforeEach(async () => {
    await clearDatabase();
  });

  describe('POST /rooms — Create room', () => {
    it('should create a room successfully', async () => {
      const { user, token } = await createTestUser();

      const response = await request(getApp())
        .post('/api/rooms/')
        .set('Authorization', `Bearer ${token}`)
        .send({ userId: user.id, title: 'My Test Room', description: 'A room for testing' });

      expect(response.status).toBe(201);
      expect(response.body.title).toBe('My Test Room');
      expect(response.body.status).toBe('live');
      expect(response.body.audio).toBeDefined();

      const rooms = await AppDataSource.getRepository(Room).find();
      expect(rooms).toHaveLength(1);
      expect(rooms[0].host_id).toBe(user.id);
    });

    it('should create a room with category', async () => {
      const { user, token } = await createTestUser();
      const category = await createTestCategory();

      const response = await request(getApp())
        .post('/api/rooms/')
        .set('Authorization', `Bearer ${token}`)
        .send({ userId: user.id, title: 'Categorized Room', categoryId: category.id });

      expect(response.status).toBe(201);
      expect(response.body.categoryId).toBe(category.id);
    });

    it('should use authenticated user as host, not body userId', async () => {
      const { user, token } = await createTestUser();

      // Body userId is ignored — host is always the authenticated user
      const response = await request(getApp())
        .post('/api/rooms/')
        .set('Authorization', `Bearer ${token}`)
        .send({ title: 'Auth Room' });

      expect(response.status).toBe(201);
      expect(response.body.host_id).toBe(user.id);
    });
  });

  describe('GET /rooms — List rooms', () => {
    it('should list only live rooms', async () => {
      const { user, token } = await createTestUser();
      await createTestRoom(user.id, { title: 'Live Room 1', status: 'live' });
      await createTestRoom(user.id, { title: 'Live Room 2', status: 'live' });
      await createTestRoom(user.id, { title: 'Ended Room', status: 'ended' });

      const response = await request(getApp())
        .get('/api/rooms/')
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(200);
      expect(response.body).toHaveLength(2);
    });

    it('should filter rooms by category slug', async () => {
      const { user, token } = await createTestUser();
      const category = await createTestCategory();
      await createTestRoom(user.id, { categoryId: category.id, title: 'Live Cat Room' });
      await createTestRoom(user.id, { title: 'Live No Cat Room' });

      const response = await request(getApp())
        .get(`/api/rooms/?category=${category.slug}`)
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(200);
      expect(response.body).toHaveLength(1);
      expect(response.body[0].title).toBe('Live Cat Room');
    });

    it('should return empty array when no rooms exist', async () => {
      const { token } = await createTestUser();

      const response = await request(getApp())
        .get('/api/rooms/')
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(200);
      expect(response.body).toHaveLength(0);
    });
  });

  describe('GET /rooms/search — Search rooms', () => {
    it('should require search query', async () => {
      const { token } = await createTestUser();

      const response = await request(getApp())
        .get('/api/rooms/search')
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(400);
      expect(response.body.error).toContain('Search query');
    });
  });

  describe('GET /categories', () => {
    it('should return 200 with an array of categories', async () => {
      const { token } = await createTestUser();
      await createTestCategory({ name: 'Music', slug: 'music' });
      await createTestCategory({ name: 'Talk', slug: 'talk' });

      const res = await request(getApp())
        .get('/api/categories')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body).toHaveLength(2);
    });
  });

  describe('GET /rooms/:id — Get room', () => {
    it('should return a room by ID', async () => {
      const { user, token } = await createTestUser();
      const room = await createTestRoom(user.id, { title: 'Specific Room' });

      const response = await request(getApp())
        .get(`/api/rooms/${room.id}`)
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(200);
      expect(response.body.title).toBe('Specific Room');
      expect(response.body.host).toBeDefined();
      expect(response.body.participants).toBeDefined();
    });

    it('should return 404 for non-existent room', async () => {
      const { token } = await createTestUser();

      const response = await request(getApp())
        .get('/api/rooms/non-existent-id')
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(404);
    });
  });

  describe('Full room lifecycle: create → join → leave → end', () => {
    it('should complete full room lifecycle', async () => {
      const host = await createTestUser({ username: 'host_lifecycle' });
      const listener = await createTestUser({ username: 'listener_lifecycle' });

      // 1. Create room
      const createRes = await request(getApp())
        .post('/api/rooms/')
        .set('Authorization', `Bearer ${host.token}`)
        .send({ userId: host.user.id, title: 'Lifecycle Room' });

      expect(createRes.status).toBe(201);
      const roomId = createRes.body.id;

      // 2. Join room
      const joinRes = await request(getApp())
        .post(`/api/rooms/${roomId}/join`)
        .set('Authorization', `Bearer ${listener.token}`)
        .send({ userId: listener.user.id });

      expect(joinRes.status).toBe(200);
      expect(joinRes.body.participant).toBeDefined();
      expect(joinRes.body.participant.role).toBe('listener');
      expect(joinRes.body.audio).toBeDefined();

      // Verify listener count increased
      const roomAfterJoin = await AppDataSource.getRepository(Room).findOneBy({ id: roomId });
      expect(roomAfterJoin!.listener_count).toBe(1);

      // 3. Leave room
      const leaveRes = await request(getApp())
        .post(`/api/rooms/${roomId}/leave`)
        .set('Authorization', `Bearer ${listener.token}`)
        .send({ userId: listener.user.id });

      expect(leaveRes.status).toBe(200);
      expect(leaveRes.body.success).toBe(true);

      // Verify listener count decreased
      const roomAfterLeave = await AppDataSource.getRepository(Room).findOneBy({ id: roomId });
      expect(roomAfterLeave!.listener_count).toBe(0);

      // 4. End room
      const endRes = await request(getApp())
        .post(`/api/rooms/${roomId}/end`)
        .set('Authorization', `Bearer ${host.token}`)
        .send({ userId: host.user.id });

      expect(endRes.status).toBe(200);
      expect(endRes.body.success).toBe(true);

      const endedRoom = await AppDataSource.getRepository(Room).findOneBy({ id: roomId });
      expect(endedRoom!.status).toBe('ended');
      expect(endedRoom!.ended_at).toBeDefined();
    });

    it('should not allow joining an ended room', async () => {
      const host = await createTestUser();
      const listener = await createTestUser();
      const room = await createTestRoom(host.user.id, { status: 'ended' });

      const joinRes = await request(getApp())
        .post(`/api/rooms/${room.id}/join`)
        .set('Authorization', `Bearer ${listener.token}`)
        .send({ userId: listener.user.id });

      expect(joinRes.status).toBe(400);
      expect(joinRes.body.error).toContain('ended');
    });

    it('should not allow non-host to end room', async () => {
      const host = await createTestUser();
      const other = await createTestUser();
      const room = await createTestRoom(host.user.id);

      const endRes = await request(getApp())
        .post(`/api/rooms/${room.id}/end`)
        .set('Authorization', `Bearer ${other.token}`)
        .send({ userId: other.user.id });

      expect(endRes.status).toBe(400);
      expect(endRes.body.error).toContain('host');
    });
  });

  describe('POST /rooms/:id/speakers — Manage speakers', () => {
    it('should allow host to promote listener to speaker', async () => {
      const host = await createTestUser({ username: 'speaker_host' });
      const listener = await createTestUser({ username: 'speaker_listener' });
      const room = await createTestRoom(host.user.id);

      const participantRepo = AppDataSource.getRepository(RoomParticipant);
      const participant = new RoomParticipant();
      participant.room_id = room.id;
      participant.user_id = listener.user.id;
      participant.role = 'listener';
      await participantRepo.save(participant);

      const response = await request(getApp())
        .post(`/api/rooms/${room.id}/speakers`)
        .set('Authorization', `Bearer ${host.token}`)
        .send({ userId: host.user.id, targetUserId: listener.user.id, role: 'speaker' });

      expect(response.status).toBe(200);
      expect(response.body.role).toBe('speaker');
    });

    it('should reject role change from non-host', async () => {
      const host = await createTestUser();
      const listener = await createTestUser();
      const room = await createTestRoom(host.user.id);

      const response = await request(getApp())
        .post(`/api/rooms/${room.id}/speakers`)
        .set('Authorization', `Bearer ${listener.token}`)
        .send({ userId: listener.user.id, targetUserId: host.user.id, role: 'listener' });

      expect(response.status).toBe(400);
      expect(response.body.error).toContain('host');
    });
  });
});
