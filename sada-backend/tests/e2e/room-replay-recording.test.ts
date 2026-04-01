import request from 'supertest';
import { setupTestDB, clearDatabase, createTestUser, createTestRoom, getApp } from './helpers';
import { RoomRecording, RecordingStatus } from '../../src/models/RoomRecording';
import { AppDataSource } from './testDb';

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

function createTestRecording(roomId: string, hostId: string, overrides: Partial<RoomRecording> = {}) {
  const repo = AppDataSource.getRepository(RoomRecording);
  const recording = new RoomRecording();
  recording.room_id = roomId;
  recording.host_id = hostId;
  recording.title = 'Test Recording';
  recording.description = null;
  recording.status = overrides.status || RecordingStatus.PUBLISHED;
  recording.started_at = overrides.started_at || new Date();
  recording.stopped_at = overrides.stopped_at || null;
  recording.listener_count = 0;
  recording.participant_count = 0;
  recording.play_count = 0;
  Object.assign(recording, overrides);
  return repo.save(recording);
}

describe('Room Recordings & Replay E2E', () => {
  beforeAll(async () => {
    await setupTestDB();
  });

  beforeEach(async () => {
    await clearDatabase();
  });

  describe('GET /rooms/:id/recordings', () => {
    it('should list published recordings for a room', async () => {
      const host = await createTestUser({ username: 'rec_host' });
      const room = await createTestRoom(host.user.id);
      await createTestRecording(room.id, host.user.id, { status: RecordingStatus.PUBLISHED });
      await createTestRecording(room.id, host.user.id, { status: RecordingStatus.STOPPED });

      const response = await request(getApp())
        .get(`/api/rooms/${room.id}/recordings`)
        .set('Authorization', `Bearer ${host.token}`);

      expect(response.status).toBe(200);
      expect(response.body).toHaveLength(1); // Only published
      expect(response.body[0].status).toBe('published');
    });

    it('should return 404 for non-existent room', async () => {
      const { token } = await createTestUser();

      const response = await request(getApp())
        .get('/api/rooms/nonexistent/recordings')
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(404);
    });
  });

  describe('GET /rooms/:id/replay', () => {
    it('should return replay data for ended room', async () => {
      const host = await createTestUser({ username: 'replay_host' });
      const room = await createTestRoom(host.user.id, { status: 'ended' });
      await createTestRecording(room.id, host.user.id, { status: RecordingStatus.PUBLISHED });

      const response = await request(getApp())
        .get(`/api/rooms/${room.id}/replay`)
        .set('Authorization', `Bearer ${host.token}`);

      expect(response.status).toBe(200);
      expect(response.body.room).toBeDefined();
      expect(response.body.room.id).toBe(room.id);
      expect(response.body.recordings).toHaveLength(1);
      expect(response.body.participants).toBeDefined();
    });

    it('should reject replay for live room', async () => {
      const host = await createTestUser({ username: 'live_host' });
      const room = await createTestRoom(host.user.id, { status: 'live' });

      const response = await request(getApp())
        .get(`/api/rooms/${room.id}/replay`)
        .set('Authorization', `Bearer ${host.token}`);

      expect(response.status).toBe(400);
      expect(response.body.error).toContain('ended');
    });

    it('should return 404 for non-existent room', async () => {
      const { token } = await createTestUser();

      const response = await request(getApp())
        .get('/api/rooms/nonexistent/replay')
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(404);
    });
  });

  describe('POST /recordings/:id/publish', () => {
    it('should allow host to publish a recording', async () => {
      const host = await createTestUser({ username: 'pub_host' });
      const room = await createTestRoom(host.user.id);
      const recording = await createTestRecording(room.id, host.user.id, { status: RecordingStatus.STOPPED });

      const response = await request(getApp())
        .post(`/api/recordings/${recording.id}/publish`)
        .set('Authorization', `Bearer ${host.token}`);

      expect(response.status).toBe(200);
      expect(response.body.status).toBe('published');
    });

    it('should reject non-host from publishing', async () => {
      const host = await createTestUser({ username: 'pub_owner' });
      const other = await createTestUser({ username: 'pub_other' });
      const room = await createTestRoom(host.user.id);
      const recording = await createTestRecording(room.id, host.user.id, { status: RecordingStatus.STOPPED });

      const response = await request(getApp())
        .post(`/api/recordings/${recording.id}/publish`)
        .set('Authorization', `Bearer ${other.token}`);

      expect(response.status).toBe(400);
    });
  });

  describe('DELETE /recordings/:id', () => {
    it('should allow host to delete a recording', async () => {
      const host = await createTestUser({ username: 'del_host' });
      const room = await createTestRoom(host.user.id);
      const recording = await createTestRecording(room.id, host.user.id);

      const response = await request(getApp())
        .delete(`/api/recordings/${recording.id}`)
        .set('Authorization', `Bearer ${host.token}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });

    it('should reject non-host from deleting', async () => {
      const host = await createTestUser({ username: 'del_owner' });
      const other = await createTestUser({ username: 'del_other' });
      const room = await createTestRoom(host.user.id);
      const recording = await createTestRecording(room.id, host.user.id);

      const response = await request(getApp())
        .delete(`/api/recordings/${recording.id}`)
        .set('Authorization', `Bearer ${other.token}`);

      expect(response.status).toBe(400);
    });
  });
});
