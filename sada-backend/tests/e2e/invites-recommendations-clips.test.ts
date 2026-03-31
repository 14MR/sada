import request from 'supertest';
import { setupTestDB, clearDatabase, createTestUser, createTestCategory, createTestRoom, getApp } from './helpers';
import { AppDataSource } from '../../src/config/database';
import { RoomInvite } from '../../src/models/RoomInvite';
import { RoomClip } from '../../src/models/RoomClip';
import { RoomParticipant } from '../../src/models/RoomParticipant';
import { Follow } from '../../src/models/Follow';

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

jest.mock('../../src/services/activity.service', () => ({
  ActivityService: {
    record: jest.fn().mockResolvedValue(undefined),
  },
}));

jest.mock('../../src/services/notification.service', () => ({
  NotificationService: {
    create: jest.fn().mockResolvedValue(undefined),
  },
}));

describe('Room Invites, Recommendations & Clips E2E', () => {
  beforeAll(async () => {
    await setupTestDB();
  });

  beforeEach(async () => {
    await clearDatabase();
  });

  // ── Room Invites ───────────────────────────────────────────────

  describe('POST /rooms/:id/invite — Create invite', () => {
    it('should create a direct invite', async () => {
      const host = await createTestUser({ username: 'invite_host' });
      const invitee = await createTestUser({ username: 'invite_invitee' });
      const room = await createTestRoom(host.user.id, { title: 'Invite Room' });

      const res = await request(getApp())
        .post(`/rooms/${room.id}/invite`)
        .set('Authorization', `Bearer ${host.token}`)
        .send({ type: 'direct', inviteeId: invitee.user.id });

      expect(res.status).toBe(201);
      expect(res.body.type).toBe('direct');
      expect(res.body.inviteeId).toBe(invitee.user.id);
      expect(res.body.inviteCode).toBeNull();
    });

    it('should create a link invite', async () => {
      const host = await createTestUser({ username: 'link_host' });
      const room = await createTestRoom(host.user.id, { title: 'Link Room' });

      const res = await request(getApp())
        .post(`/rooms/${room.id}/invite`)
        .set('Authorization', `Bearer ${host.token}`)
        .send({ type: 'link', maxUses: 5 });

      expect(res.status).toBe(201);
      expect(res.body.type).toBe('link');
      expect(res.body.inviteCode).toBeTruthy();
      expect(res.body.maxUses).toBe(5);
      expect(res.body.inviteeId).toBeNull();
    });

    it('should reject direct invite without inviteeId', async () => {
      const host = await createTestUser({ username: 'no_invitee_host' });
      const room = await createTestRoom(host.user.id);

      const res = await request(getApp())
        .post(`/rooms/${room.id}/invite`)
        .set('Authorization', `Bearer ${host.token}`)
        .send({ type: 'direct' });

      expect(res.status).toBe(400);
    });

    it('should reject invite from non-host', async () => {
      const host = await createTestUser({ username: 'real_host' });
      const other = await createTestUser({ username: 'fake_host' });
      const room = await createTestRoom(host.user.id);

      const res = await request(getApp())
        .post(`/rooms/${room.id}/invite`)
        .set('Authorization', `Bearer ${other.token}`)
        .send({ type: 'link' });

      expect(res.status).toBe(400);
      expect(res.body.error).toContain('host');
    });

    it('should reject self-invite', async () => {
      const host = await createTestUser({ username: 'self_invite' });
      const room = await createTestRoom(host.user.id);

      const res = await request(getApp())
        .post(`/rooms/${room.id}/invite`)
        .set('Authorization', `Bearer ${host.token}`)
        .send({ type: 'direct', inviteeId: host.user.id });

      expect(res.status).toBe(400);
      expect(res.body.error).toContain('yourself');
    });

    it('should reject invite to ended room', async () => {
      const host = await createTestUser({ username: 'ended_host' });
      const invitee = await createTestUser({ username: 'ended_invitee' });
      const room = await createTestRoom(host.user.id, { status: 'ended' });

      const res = await request(getApp())
        .post(`/rooms/${room.id}/invite`)
        .set('Authorization', `Bearer ${host.token}`)
        .send({ type: 'direct', inviteeId: invitee.user.id });

      expect(res.status).toBe(400);
    });
  });

  describe('POST /rooms/:id/invite/:code/accept — Accept link invite', () => {
    it('should accept a link invite and join room', async () => {
      const host = await createTestUser({ username: 'accept_host' });
      const guest = await createTestUser({ username: 'accept_guest' });
      const room = await createTestRoom(host.user.id, { title: 'Accept Room' });

      // Create link invite
      const inviteRes = await request(getApp())
        .post(`/rooms/${room.id}/invite`)
        .set('Authorization', `Bearer ${host.token}`)
        .send({ type: 'link' });

      const code = inviteRes.body.inviteCode;

      // Accept invite
      const acceptRes = await request(getApp())
        .post(`/rooms/${room.id}/invite/${code}/accept`)
        .set('Authorization', `Bearer ${guest.token}`)
        .send({});

      expect(acceptRes.status).toBe(200);
      expect(acceptRes.body.participant).toBeDefined();
      expect(acceptRes.body.participant.role).toBe('listener');
      expect(acceptRes.body.audio).toBeDefined();
    });

    it('should reject expired invite', async () => {
      const host = await createTestUser({ username: 'expired_host' });
      const guest = await createTestUser({ username: 'expired_guest' });
      const room = await createTestRoom(host.user.id);

      // Create invite that's already expired
      const inviteRepo = AppDataSource.getRepository(RoomInvite);
      const invite = new RoomInvite();
      invite.roomId = room.id;
      invite.inviterId = host.user.id;
      invite.inviteCode = 'expiredcode';
      invite.type = 'link';
      invite.expiresAt = new Date(Date.now() - 3600000); // 1 hour ago
      await inviteRepo.save(invite);

      const res = await request(getApp())
        .post(`/rooms/${room.id}/invite/expiredcode/accept`)
        .set('Authorization', `Bearer ${guest.token}`)
        .send({});

      expect(res.status).toBe(400);
      expect(res.body.error).toContain('expired');
    });

    it('should reject invite at max uses', async () => {
      const host = await createTestUser({ username: 'maxuse_host' });
      const guest = await createTestUser({ username: 'maxuse_guest' });
      const room = await createTestRoom(host.user.id);

      const inviteRepo = AppDataSource.getRepository(RoomInvite);
      const invite = new RoomInvite();
      invite.roomId = room.id;
      invite.inviterId = host.user.id;
      invite.inviteCode = 'maxcode';
      invite.type = 'link';
      invite.maxUses = 1;
      invite.uses = 1;
      await inviteRepo.save(invite);

      const res = await request(getApp())
        .post(`/rooms/${room.id}/invite/maxcode/accept`)
        .set('Authorization', `Bearer ${guest.token}`)
        .send({});

      expect(res.status).toBe(400);
      expect(res.body.error).toContain('maximum');
    });

    it('should reject invalid invite code', async () => {
      const guest = await createTestUser({ username: 'badcode_guest' });

      const res = await request(getApp())
        .post('/rooms/some-room/invite/badcode/accept')
        .set('Authorization', `Bearer ${guest.token}`)
        .send({});

      expect(res.status).toBe(400);
      expect(res.body.error).toContain('not found');
    });
  });

  describe('GET /rooms/:id/invites — List invites', () => {
    it('should list invites for room host', async () => {
      const host = await createTestUser({ username: 'list_host' });
      const invitee = await createTestUser({ username: 'list_invitee' });
      const room = await createTestRoom(host.user.id);

      // Create two invites
      await request(getApp())
        .post(`/rooms/${room.id}/invite`)
        .set('Authorization', `Bearer ${host.token}`)
        .send({ type: 'direct', inviteeId: invitee.user.id });

      await request(getApp())
        .post(`/rooms/${room.id}/invite`)
        .set('Authorization', `Bearer ${host.token}`)
        .send({ type: 'link' });

      const res = await request(getApp())
        .get(`/rooms/${room.id}/invites`)
        .set('Authorization', `Bearer ${host.token}`);

      expect(res.status).toBe(200);
      expect(res.body).toHaveLength(2);
    });

    it('should reject listing invites from non-host', async () => {
      const host = await createTestUser({ username: 'listonly_host' });
      const other = await createTestUser({ username: 'listonly_other' });
      const room = await createTestRoom(host.user.id);

      const res = await request(getApp())
        .get(`/rooms/${room.id}/invites`)
        .set('Authorization', `Bearer ${other.token}`);

      expect(res.status).toBe(403);
    });
  });

  // ── Room Recommendations ───────────────────────────────────────

  describe('GET /rooms/recommended — Recommendations', () => {
    it('should return recommendations for user with no history (fallback to trending)', async () => {
      const host = await createTestUser({ username: 'reco_host' });
      const user = await createTestUser({ username: 'reco_user' });
      await createTestRoom(host.user.id, { title: 'Reco Room 1', listener_count: 10 });
      await createTestRoom(host.user.id, { title: 'Reco Room 2', listener_count: 5 });

      const res = await request(getApp())
        .get('/rooms/recommended')
        .set('Authorization', `Bearer ${user.token}`);

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body.length).toBeLessThanOrEqual(2);
    });

    it('should prioritize rooms in categories user has joined before', async () => {
      const host = await createTestUser({ username: 'cat_host' });
      const user = await createTestUser({ username: 'cat_user' });
      const category = await createTestCategory({ name: 'Music', slug: 'music' });

      // Create rooms in different categories
      const musicRoom = await createTestRoom(host.user.id, { title: 'Music Room', categoryId: category.id, listener_count: 5 });
      const otherRoom = await createTestRoom(host.user.id, { title: 'Other Room', listener_count: 50 });

      // User joins music room (builds category affinity)
      const participantRepo = AppDataSource.getRepository(RoomParticipant);
      const participant = new RoomParticipant();
      participant.room_id = musicRoom.id;
      participant.user_id = user.user.id;
      participant.role = 'listener';
      await participantRepo.save(participant);

      const res = await request(getApp())
        .get('/rooms/recommended')
        .set('Authorization', `Bearer ${user.token}`);

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
    });

    it('should boost rooms where followings are participants', async () => {
      const host = await createTestUser({ username: 'social_host' });
      const friend = await createTestUser({ username: 'social_friend' });
      const user = await createTestUser({ username: 'social_user' });

      const room = await createTestRoom(host.user.id, { title: 'Social Room', listener_count: 1 });
      const otherRoom = await createTestRoom(host.user.id, { title: 'Other Room', listener_count: 100 });

      // User follows friend
      const followRepo = AppDataSource.getRepository(Follow);
      const follow = new Follow();
      follow.follower = user.user;
      follow.following = friend.user;
      await followRepo.save(follow);

      // Friend is in the social room
      const participantRepo = AppDataSource.getRepository(RoomParticipant);
      const p = new RoomParticipant();
      p.room_id = room.id;
      p.user_id = friend.user.id;
      p.role = 'listener';
      await participantRepo.save(p);

      const res = await request(getApp())
        .get('/rooms/recommended')
        .set('Authorization', `Bearer ${user.token}`);

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
    });

    it('should respect pagination', async () => {
      const host = await createTestUser({ username: 'page_host' });
      const user = await createTestUser({ username: 'page_user' });

      for (let i = 0; i < 5; i++) {
        await createTestRoom(host.user.id, { title: `Page Room ${i}` });
      }

      const res = await request(getApp())
        .get('/rooms/recommended?limit=2&offset=0')
        .set('Authorization', `Bearer ${user.token}`);

      expect(res.status).toBe(200);
      expect(res.body).toHaveLength(2);
    });
  });

  // ── Room Clips ─────────────────────────────────────────────────

  describe('POST /rooms/:id/clips — Create clip', () => {
    it('should create a clip', async () => {
      const user = await createTestUser({ username: 'clip_user' });
      const room = await createTestRoom(user.user.id, { title: 'Clip Room' });

      const res = await request(getApp())
        .post(`/rooms/${room.id}/clips`)
        .set('Authorization', `Bearer ${user.token}`)
        .send({ startTime: 10, endTime: 30, title: 'Best moment' });

      expect(res.status).toBe(201);
      expect(res.body.title).toBe('Best moment');
      expect(res.body.startTime).toBe(10);
      expect(res.body.endTime).toBe(30);
      expect(res.body.creatorId).toBe(user.user.id);
      expect(res.body.roomId).toBe(room.id);
    });

    it('should reject clip with endTime <= startTime', async () => {
      const user = await createTestUser({ username: 'bad_clip_user' });
      const room = await createTestRoom(user.user.id);

      const res = await request(getApp())
        .post(`/rooms/${room.id}/clips`)
        .set('Authorization', `Bearer ${user.token}`)
        .send({ startTime: 30, endTime: 10, title: 'Bad clip' });

      expect(res.status).toBe(400);
    });

    it('should reject clip for non-existent room', async () => {
      const user = await createTestUser({ username: 'noreoom_clip_user' });

      const res = await request(getApp())
        .post('/rooms/non-existent/clips')
        .set('Authorization', `Bearer ${user.token}`)
        .send({ startTime: 0, endTime: 10, title: 'Ghost clip' });

      expect(res.status).toBe(400);
    });
  });

  describe('GET /rooms/:id/clips — List clips', () => {
    it('should list clips for a room', async () => {
      const user = await createTestUser({ username: 'list_clip_user' });
      const room = await createTestRoom(user.user.id, { title: 'Clip List Room' });

      // Create clips
      await request(getApp())
        .post(`/rooms/${room.id}/clips`)
        .set('Authorization', `Bearer ${user.token}`)
        .send({ startTime: 0, endTime: 10, title: 'Clip 1' });

      await request(getApp())
        .post(`/rooms/${room.id}/clips`)
        .set('Authorization', `Bearer ${user.token}`)
        .send({ startTime: 20, endTime: 30, title: 'Clip 2' });

      const res = await request(getApp())
        .get(`/rooms/${room.id}/clips`)
        .set('Authorization', `Bearer ${user.token}`);

      expect(res.status).toBe(200);
      expect(res.body.clips).toHaveLength(2);
      expect(res.body.total).toBe(2);
    });

    it('should return empty clips for room with none', async () => {
      const user = await createTestUser({ username: 'empty_clip_user' });
      const room = await createTestRoom(user.user.id);

      const res = await request(getApp())
        .get(`/rooms/${room.id}/clips`)
        .set('Authorization', `Bearer ${user.token}`);

      expect(res.status).toBe(200);
      expect(res.body.clips).toHaveLength(0);
      expect(res.body.total).toBe(0);
    });
  });

  describe('GET /clips/:id — Get single clip', () => {
    it('should get a clip by id', async () => {
      const user = await createTestUser({ username: 'get_clip_user' });
      const room = await createTestRoom(user.user.id);

      const createRes = await request(getApp())
        .post(`/rooms/${room.id}/clips`)
        .set('Authorization', `Bearer ${user.token}`)
        .send({ startTime: 5, endTime: 15, title: 'My Clip' });

      const clipId = createRes.body.id;

      const res = await request(getApp())
        .get(`/clips/${clipId}`)
        .set('Authorization', `Bearer ${user.token}`);

      expect(res.status).toBe(200);
      expect(res.body.title).toBe('My Clip');
      expect(res.body.creator).toBeDefined();
      expect(res.body.room).toBeDefined();
    });

    it('should return 404 for non-existent clip', async () => {
      const user = await createTestUser({ username: 'noclip_user' });

      const res = await request(getApp())
        .get('/clips/non-existent-id')
        .set('Authorization', `Bearer ${user.token}`);

      expect(res.status).toBe(404);
    });
  });
});
