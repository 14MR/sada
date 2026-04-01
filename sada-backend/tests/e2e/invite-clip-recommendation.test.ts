import request from 'supertest';
import { setupTestDB, clearDatabase, createTestUser, createTestCategory, createTestRoom, getApp } from './helpers';
import { AppDataSource } from './testDb';
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

describe('Room Invites, Clips & Recommendations E2E', () => {
  beforeAll(async () => {
    await setupTestDB();
  });

  beforeEach(async () => {
    await clearDatabase();
  });

  // ── Room Invites ──────────────────────────────────────────────────

  describe('POST /rooms/:id/invites — Create invite', () => {
    it('should create a direct invite', async () => {
      const host = await createTestUser({ username: 'invite_host' });
      const invitee = await createTestUser({ username: 'invite_invitee' });
      const room = await createTestRoom(host.user.id, { title: 'Invite Room' });

      const res = await request(getApp())
        .post(`/api/rooms/${room.id}/invites`)
        .set('Authorization', `Bearer ${host.token}`)
        .send({ type: 'direct', inviteeId: invitee.user.id });

      expect(res.status).toBe(201);
      expect(res.body.type).toBe('direct');
      expect(res.body.roomId).toBe(room.id);
      expect(res.body.inviteeId).toBe(invitee.user.id);
    });

    it('should create a link invite with maxUses and expiresAt', async () => {
      const host = await createTestUser({ username: 'link_host' });
      const room = await createTestRoom(host.user.id);
      const expiresAt = new Date(Date.now() + 86400000).toISOString();

      const res = await request(getApp())
        .post(`/api/rooms/${room.id}/invites`)
        .set('Authorization', `Bearer ${host.token}`)
        .send({ type: 'link', maxUses: 5, expiresAt });

      expect(res.status).toBe(201);
      expect(res.body.type).toBe('link');
      expect(res.body.inviteCode).toBeDefined();
      expect(res.body.maxUses).toBe(5);
    });

    it('should reject direct invite without inviteeId', async () => {
      const host = await createTestUser({ username: 'link_host2' });
      const room = await createTestRoom(host.user.id);

      const res = await request(getApp())
        .post(`/api/rooms/${room.id}/invites`)
        .set('Authorization', `Bearer ${host.token}`)
        .send({ type: 'direct' });

      expect(res.status).toBe(400);
    });

    it('should require authentication', async () => {
      const host = await createTestUser();
      const room = await createTestRoom(host.user.id);

      const res = await request(getApp())
        .post(`/api/rooms/${room.id}/invites`)
        .send({ type: 'link' });

      expect(res.status).toBe(401);
    });

    it('should reject non-host from creating invite', async () => {
      const host = await createTestUser({ username: 'real_host' });
      const other = await createTestUser({ username: 'not_host' });
      const room = await createTestRoom(host.user.id);

      const res = await request(getApp())
        .post(`/api/rooms/${room.id}/invites`)
        .set('Authorization', `Bearer ${other.token}`)
        .send({ type: 'link' });

      expect(res.status).toBe(400);
      expect(res.body.error).toContain('host');
    });
  });

  describe('POST /rooms/invites/:code/accept — Accept invite', () => {
    it('should accept a link invite and join room', async () => {
      const host = await createTestUser({ username: 'accept_host' });
      const guest = await createTestUser({ username: 'accept_guest' });
      const room = await createTestRoom(host.user.id);

      // Create link invite directly
      const inviteRepo = AppDataSource.getRepository(RoomInvite);
      const invite = new RoomInvite();
      invite.roomId = room.id;
      invite.inviterId = host.user.id;
      invite.inviteCode = 'testcode123';
      invite.type = 'link';
      invite.maxUses = 10;
      invite.uses = 0;
      await inviteRepo.save(invite);

      const res = await request(getApp())
        .post(`/api/rooms/invites/testcode123/accept`)
        .set('Authorization', `Bearer ${guest.token}`)
        .send({});

      expect(res.status).toBe(200);
      expect(res.body.participant).toBeDefined();
      expect(res.body.audio).toBeDefined();
    });

    it('should reject expired invite', async () => {
      const host = await createTestUser({ username: 'expired_host' });
      const guest = await createTestUser({ username: 'expired_guest' });
      const room = await createTestRoom(host.user.id);

      const inviteRepo = AppDataSource.getRepository(RoomInvite);
      const invite = new RoomInvite();
      invite.roomId = room.id;
      invite.inviterId = host.user.id;
      invite.inviteCode = 'expiredcode';
      invite.type = 'link';
      invite.expiresAt = new Date(Date.now() - 3600000);
      await inviteRepo.save(invite);

      const res = await request(getApp())
        .post(`/api/rooms/invites/expiredcode/accept`)
        .set('Authorization', `Bearer ${guest.token}`)
        .send({});

      expect(res.status).toBe(400);
      expect(res.body.error).toContain('expired');
    });

    it('should reject invite that exceeded max uses', async () => {
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
        .post(`/api/rooms/invites/maxcode/accept`)
        .set('Authorization', `Bearer ${guest.token}`)
        .send({});

      expect(res.status).toBe(400);
      expect(res.body.error).toContain('maximum');
    });

    it('should reject invalid code', async () => {
      const guest = await createTestUser({ username: 'badcode_guest' });

      const res = await request(getApp())
        .post(`/api/rooms/invites/nonexistent/accept`)
        .set('Authorization', `Bearer ${guest.token}`)
        .send({});

      expect(res.status).toBe(400);
      expect(res.body.error).toContain('not found');
    });

    it('should require authentication', async () => {
      const res = await request(getApp())
        .post(`/api/rooms/invites/somecode/accept`)
        .send({});

      expect(res.status).toBe(401);
    });
  });

  describe('GET /rooms/:id/invites — List invites', () => {
    it('should list invites for room host', async () => {
      const host = await createTestUser({ username: 'list_host' });
      const invitee = await createTestUser({ username: 'list_invitee' });
      const room = await createTestRoom(host.user.id);

      const inviteRepo = AppDataSource.getRepository(RoomInvite);
      const invite = new RoomInvite();
      invite.roomId = room.id;
      invite.inviterId = host.user.id;
      invite.inviteeId = invitee.user.id;
      invite.type = 'direct';
      await inviteRepo.save(invite);

      const res = await request(getApp())
        .get(`/api/rooms/${room.id}/invites`)
        .set('Authorization', `Bearer ${host.token}`);

      expect(res.status).toBe(200);
      expect(res.body).toHaveLength(1);
      expect(res.body[0].type).toBe('direct');
    });

    it('should reject non-host from listing invites', async () => {
      const host = await createTestUser({ username: 'list_real_host' });
      const other = await createTestUser({ username: 'list_not_host' });
      const room = await createTestRoom(host.user.id);

      const res = await request(getApp())
        .get(`/api/rooms/${room.id}/invites`)
        .set('Authorization', `Bearer ${other.token}`);

      expect(res.status).toBe(403);
    });

    it('should require authentication', async () => {
      const host = await createTestUser();
      const room = await createTestRoom(host.user.id);

      const res = await request(getApp())
        .get(`/api/rooms/${room.id}/invites`);

      expect(res.status).toBe(401);
    });
  });

  // ── Room Clips ────────────────────────────────────────────────────

  describe('POST /rooms/:id/clips — Create clip', () => {
    it('should create a clip', async () => {
      const user = await createTestUser({ username: 'clip_creator' });
      const room = await createTestRoom(user.user.id);

      const res = await request(getApp())
        .post(`/api/rooms/${room.id}/clips`)
        .set('Authorization', `Bearer ${user.token}`)
        .send({ startTime: 10, endTime: 30, title: 'Best moment' });

      expect(res.status).toBe(201);
      expect(res.body.title).toBe('Best moment');
      expect(res.body.startTime).toBe(10);
      expect(res.body.endTime).toBe(30);
      expect(res.body.roomId).toBe(room.id);
    });

    it('should reject clip with endTime <= startTime', async () => {
      const user = await createTestUser({ username: 'clip_bad' });
      const room = await createTestRoom(user.user.id);

      const res = await request(getApp())
        .post(`/api/rooms/${room.id}/clips`)
        .set('Authorization', `Bearer ${user.token}`)
        .send({ startTime: 30, endTime: 10, title: 'Bad clip' });

      expect(res.status).toBe(400);
    });

    it('should reject clip with empty title', async () => {
      const user = await createTestUser({ username: 'clip_notitle' });
      const room = await createTestRoom(user.user.id);

      const res = await request(getApp())
        .post(`/api/rooms/${room.id}/clips`)
        .set('Authorization', `Bearer ${user.token}`)
        .send({ startTime: 0, endTime: 10, title: '' });

      expect(res.status).toBe(400);
    });

    it('should reject clip for non-existent room', async () => {
      const user = await createTestUser({ username: 'clip_noroom' });

      const res = await request(getApp())
        .post(`/api/rooms/nonexistent-id/clips`)
        .set('Authorization', `Bearer ${user.token}`)
        .send({ startTime: 0, endTime: 10, title: 'No room clip' });

      expect(res.status).toBe(400);
      expect(res.body.error).toContain('not found');
    });

    it('should require authentication', async () => {
      const host = await createTestUser();
      const room = await createTestRoom(host.user.id);

      const res = await request(getApp())
        .post(`/api/rooms/${room.id}/clips`)
        .send({ startTime: 0, endTime: 10, title: 'No auth' });

      expect(res.status).toBe(401);
    });
  });

  describe('GET /rooms/:id/clips — List clips', () => {
    it('should list clips for a room', async () => {
      const user = await createTestUser({ username: 'clip_list_user' });
      const room = await createTestRoom(user.user.id);

      const clipRepo = AppDataSource.getRepository(RoomClip);
      await clipRepo.save({ roomId: room.id, creatorId: user.user.id, startTime: 0, endTime: 10, title: 'Clip 1' });
      await clipRepo.save({ roomId: room.id, creatorId: user.user.id, startTime: 20, endTime: 40, title: 'Clip 2' });

      const res = await request(getApp())
        .get(`/api/rooms/${room.id}/clips`)
        .set('Authorization', `Bearer ${user.token}`);

      expect(res.status).toBe(200);
      expect(res.body.clips).toHaveLength(2);
      expect(res.body.total).toBe(2);
    });

    it('should return empty list for room with no clips', async () => {
      const host = await createTestUser({ username: 'clip_empty_host' });
      const room = await createTestRoom(host.user.id);

      const res = await request(getApp())
        .get(`/api/rooms/${room.id}/clips`)
        .set('Authorization', `Bearer ${host.token}`);

      expect(res.status).toBe(200);
      expect(res.body.clips).toHaveLength(0);
      expect(res.body.total).toBe(0);
    });
  });

  describe('GET /rooms/clips/:id — Get single clip', () => {
    it('should return a clip by ID', async () => {
      const user = await createTestUser({ username: 'clip_get_user' });
      const room = await createTestRoom(user.user.id);

      const clipRepo = AppDataSource.getRepository(RoomClip);
      const clip = await clipRepo.save({ roomId: room.id, creatorId: user.user.id, startTime: 5, endTime: 15, title: 'Specific Clip' });

      const res = await request(getApp())
        .get(`/api/rooms/clips/${clip.id}`)
        .set('Authorization', `Bearer ${user.token}`);

      expect(res.status).toBe(200);
      expect(res.body.title).toBe('Specific Clip');
    });

    it('should return 404 for non-existent clip', async () => {
      const user = await createTestUser();

      const res = await request(getApp())
        .get(`/api/rooms/clips/nonexistent-id`)
        .set('Authorization', `Bearer ${user.token}`);

      expect(res.status).toBe(404);
    });
  });

  // ── Room Recommendations ──────────────────────────────────────────

  describe('GET /rooms/recommended — Personalized recommendations', () => {
    it('should return recommended rooms for authenticated user', async () => {
      const user = await createTestUser({ username: 'rec_user' });
      const category = await createTestCategory();

      await createTestRoom(user.user.id, { title: 'Rec Room 1', categoryId: category.id });
      await createTestRoom(user.user.id, { title: 'Rec Room 2', categoryId: category.id });

      const res = await request(getApp())
        .get('/api/rooms/recommended')
        .set('Authorization', `Bearer ${user.token}`);

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body.length).toBeGreaterThanOrEqual(2);
    });

    it('should return empty array when no live rooms exist', async () => {
      const user = await createTestUser({ username: 'rec_empty_user' });

      const res = await request(getApp())
        .get('/api/rooms/recommended')
        .set('Authorization', `Bearer ${user.token}`);

      expect(res.status).toBe(200);
      expect(res.body).toHaveLength(0);
    });

    it('should require authentication', async () => {
      const res = await request(getApp())
        .get('/api/rooms/recommended');

      expect(res.status).toBe(401);
    });
  });
});
