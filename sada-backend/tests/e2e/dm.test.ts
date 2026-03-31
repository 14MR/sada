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

describe('Direct Messaging E2E', () => {
  beforeAll(async () => {
    await setupTestDB();
  });

  beforeEach(async () => {
    await clearDatabase();
  });

  // ── Create Direct Conversation ─────────────────────────────────────

  describe('POST /conversations (direct)', () => {
    it('should create a direct conversation', async () => {
      const user1 = await createTestUser({ username: 'dm_user1' });
      const user2 = await createTestUser({ username: 'dm_user2' });

      const response = await request(getApp())
        .post('/conversations')
        .set('Authorization', `Bearer ${user1.token}`)
        .send({ type: 'direct', userId: user2.user.id });

      expect(response.status).toBe(201);
      expect(response.body.type).toBe('direct');
      expect(response.body.participants).toHaveLength(2);
    });

    it('should return existing conversation on duplicate creation', async () => {
      const user1 = await createTestUser({ username: 'dup_user1' });
      const user2 = await createTestUser({ username: 'dup_user2' });

      const res1 = await request(getApp())
        .post('/conversations')
        .set('Authorization', `Bearer ${user1.token}`)
        .send({ type: 'direct', userId: user2.user.id });

      const res2 = await request(getApp())
        .post('/conversations')
        .set('Authorization', `Bearer ${user1.token}`)
        .send({ type: 'direct', userId: user2.user.id });

      expect(res1.status).toBe(201);
      expect(res2.status).toBe(201);
      expect(res1.body.id).toBe(res2.body.id);
    });

    it('should not allow creating DM with yourself', async () => {
      const user = await createTestUser({ username: 'self_dm' });

      const response = await request(getApp())
        .post('/conversations')
        .set('Authorization', `Bearer ${user.token}`)
        .send({ type: 'direct', userId: user.user.id });

      expect(response.status).toBe(400);
      expect(response.body.error).toContain('yourself');
    });

    it('should not allow DM with non-existent user', async () => {
      const user = await createTestUser({ username: 'ghost_dm' });

      const response = await request(getApp())
        .post('/conversations')
        .set('Authorization', `Bearer ${user.token}`)
        .send({ type: 'direct', userId: 'non-existent-id' });

      expect(response.status).toBe(400);
      expect(response.body.error).toContain('not found');
    });

    it('should not allow DM with blocked user', async () => {
      const user1 = await createTestUser({ username: 'blocker_dm' });
      const user2 = await createTestUser({ username: 'blocked_dm' });

      // Block user2
      await request(getApp())
        .post('/moderation/block')
        .set('Authorization', `Bearer ${user1.token}`)
        .send({ blockedId: user2.user.id });

      const response = await request(getApp())
        .post('/conversations')
        .set('Authorization', `Bearer ${user1.token}`)
        .send({ type: 'direct', userId: user2.user.id });

      expect(response.status).toBe(400);
      expect(response.body.error).toContain('Cannot');
    });

    it('should require authentication', async () => {
      const response = await request(getApp())
        .post('/conversations')
        .send({ type: 'direct', userId: 'some-id' });

      expect(response.status).toBe(401);
    });

    it('should validate required fields', async () => {
      const user = await createTestUser();

      const response = await request(getApp())
        .post('/conversations')
        .set('Authorization', `Bearer ${user.token}`)
        .send({ type: 'direct' });

      expect(response.status).toBe(400);
    });
  });

  // ── Create Group Conversation ──────────────────────────────────────

  describe('POST /conversations (group)', () => {
    it('should create a group conversation', async () => {
      const admin = await createTestUser({ username: 'grp_admin' });
      const member1 = await createTestUser({ username: 'grp_m1' });
      const member2 = await createTestUser({ username: 'grp_m2' });

      const response = await request(getApp())
        .post('/conversations')
        .set('Authorization', `Bearer ${admin.token}`)
        .send({ type: 'group', userIds: [member1.user.id, member2.user.id], name: 'Test Group' });

      expect(response.status).toBe(201);
      expect(response.body.type).toBe('group');
      expect(response.body.name).toBe('Test Group');
      expect(response.body.participants).toHaveLength(3);
    });

    it('should require name for group conversation', async () => {
      const admin = await createTestUser({ username: 'grp_noname' });
      const member = await createTestUser({ username: 'grp_member' });

      const response = await request(getApp())
        .post('/conversations')
        .set('Authorization', `Bearer ${admin.token}`)
        .send({ type: 'group', userIds: [member.user.id] });

      expect(response.status).toBe(400);
    });

    it('should require userIds for group conversation', async () => {
      const admin = await createTestUser({ username: 'grp_noids' });

      const response = await request(getApp())
        .post('/conversations')
        .set('Authorization', `Bearer ${admin.token}`)
        .send({ type: 'group', name: 'No IDs Group' });

      expect(response.status).toBe(400);
    });

    it('should not add blocked users to group', async () => {
      const admin = await createTestUser({ username: 'grp_blocker' });
      const blocked = await createTestUser({ username: 'grp_blocked' });

      await request(getApp())
        .post('/moderation/block')
        .set('Authorization', `Bearer ${admin.token}`)
        .send({ blockedId: blocked.user.id });

      const response = await request(getApp())
        .post('/conversations')
        .set('Authorization', `Bearer ${admin.token}`)
        .send({ type: 'group', userIds: [blocked.user.id], name: 'Blocked Group' });

      expect(response.status).toBe(400);
      expect(response.body.error).toContain('blocked');
    });
  });

  // ── List Conversations ─────────────────────────────────────────────

  describe('GET /conversations', () => {
    it('should list my conversations', async () => {
      const user1 = await createTestUser({ username: 'list_u1' });
      const user2 = await createTestUser({ username: 'list_u2' });
      const user3 = await createTestUser({ username: 'list_u3' });

      // Create two conversations
      await request(getApp())
        .post('/conversations')
        .set('Authorization', `Bearer ${user1.token}`)
        .send({ type: 'direct', userId: user2.user.id });

      await request(getApp())
        .post('/conversations')
        .set('Authorization', `Bearer ${user1.token}`)
        .send({ type: 'direct', userId: user3.user.id });

      const response = await request(getApp())
        .get('/conversations')
        .set('Authorization', `Bearer ${user1.token}`);

      expect(response.status).toBe(200);
      expect(response.body).toHaveLength(2);
    });

    it('should return empty array when no conversations', async () => {
      const user = await createTestUser({ username: 'no_convos' });

      const response = await request(getApp())
        .get('/conversations')
        .set('Authorization', `Bearer ${user.token}`);

      expect(response.status).toBe(200);
      expect(response.body).toHaveLength(0);
    });

    it('should require authentication', async () => {
      const response = await request(getApp()).get('/conversations');
      expect(response.status).toBe(401);
    });

    it('should support pagination', async () => {
      const user1 = await createTestUser({ username: 'pag_u1' });

      // Create 3 conversations
      for (let i = 0; i < 3; i++) {
        const other = await createTestUser({ username: `pag_other_${i}` });
        await request(getApp())
          .post('/conversations')
          .set('Authorization', `Bearer ${user1.token}`)
          .send({ type: 'direct', userId: other.user.id });
      }

      const page1 = await request(getApp())
        .get('/conversations?limit=2&offset=0')
        .set('Authorization', `Bearer ${user1.token}`);

      const page2 = await request(getApp())
        .get('/conversations?limit=2&offset=2')
        .set('Authorization', `Bearer ${user1.token}`);

      expect(page1.body).toHaveLength(2);
      expect(page2.body).toHaveLength(1);
    });
  });

  // ── Get Conversation ───────────────────────────────────────────────

  describe('GET /conversations/:id', () => {
    it('should get conversation with participants and messages', async () => {
      const user1 = await createTestUser({ username: 'get_u1' });
      const user2 = await createTestUser({ username: 'get_u2' });

      const createRes = await request(getApp())
        .post('/conversations')
        .set('Authorization', `Bearer ${user1.token}`)
        .send({ type: 'direct', userId: user2.user.id });

      // Send a message
      await request(getApp())
        .post(`/conversations/${createRes.body.id}/messages`)
        .set('Authorization', `Bearer ${user1.token}`)
        .send({ content: 'Hello!' });

      const response = await request(getApp())
        .get(`/conversations/${createRes.body.id}`)
        .set('Authorization', `Bearer ${user1.token}`);

      expect(response.status).toBe(200);
      expect(response.body.participants).toHaveLength(2);
      expect(response.body.messages).toHaveLength(1);
      expect(response.body.messages[0].content).toBe('Hello!');
    });

    it('should not allow non-participants to view conversation', async () => {
      const user1 = await createTestUser({ username: 'view_u1' });
      const user2 = await createTestUser({ username: 'view_u2' });
      const stranger = await createTestUser({ username: 'view_stranger' });

      const createRes = await request(getApp())
        .post('/conversations')
        .set('Authorization', `Bearer ${user1.token}`)
        .send({ type: 'direct', userId: user2.user.id });

      const response = await request(getApp())
        .get(`/conversations/${createRes.body.id}`)
        .set('Authorization', `Bearer ${stranger.token}`);

      expect(response.status).toBe(403);
    });
  });

  // ── Send Message ───────────────────────────────────────────────────

  describe('POST /conversations/:id/messages', () => {
    it('should send a text message', async () => {
      const user1 = await createTestUser({ username: 'msg_u1' });
      const user2 = await createTestUser({ username: 'msg_u2' });

      const createRes = await request(getApp())
        .post('/conversations')
        .set('Authorization', `Bearer ${user1.token}`)
        .send({ type: 'direct', userId: user2.user.id });

      const response = await request(getApp())
        .post(`/conversations/${createRes.body.id}/messages`)
        .set('Authorization', `Bearer ${user1.token}`)
        .send({ content: 'Hello World!' });

      expect(response.status).toBe(201);
      expect(response.body.content).toBe('Hello World!');
      expect(response.body.type).toBe('text');
      expect(response.body.senderId).toBe(user1.user.id);
    });

    it('should send an image message', async () => {
      const user1 = await createTestUser({ username: 'img_u1' });
      const user2 = await createTestUser({ username: 'img_u2' });

      const createRes = await request(getApp())
        .post('/conversations')
        .set('Authorization', `Bearer ${user1.token}`)
        .send({ type: 'direct', userId: user2.user.id });

      const response = await request(getApp())
        .post(`/conversations/${createRes.body.id}/messages`)
        .set('Authorization', `Bearer ${user1.token}`)
        .send({ content: 'https://example.com/image.jpg', type: 'image' });

      expect(response.status).toBe(201);
      expect(response.body.type).toBe('image');
    });

    it('should send a gift message with metadata', async () => {
      const user1 = await createTestUser({ username: 'gift_u1' });
      const user2 = await createTestUser({ username: 'gift_u2' });

      const createRes = await request(getApp())
        .post('/conversations')
        .set('Authorization', `Bearer ${user1.token}`)
        .send({ type: 'direct', userId: user2.user.id });

      const response = await request(getApp())
        .post(`/conversations/${createRes.body.id}/messages`)
        .set('Authorization', `Bearer ${user1.token}`)
        .send({ content: 'Sent you a gift!', type: 'gift', metadata: { gemAmount: 10 } });

      expect(response.status).toBe(201);
      expect(response.body.type).toBe('gift');
      expect(response.body.metadata).toEqual({ gemAmount: 10 });
    });

    it('should reject empty content', async () => {
      const user1 = await createTestUser({ username: 'empty_u1' });
      const user2 = await createTestUser({ username: 'empty_u2' });

      const createRes = await request(getApp())
        .post('/conversations')
        .set('Authorization', `Bearer ${user1.token}`)
        .send({ type: 'direct', userId: user2.user.id });

      const response = await request(getApp())
        .post(`/conversations/${createRes.body.id}/messages`)
        .set('Authorization', `Bearer ${user1.token}`)
        .send({ content: '' });

      expect(response.status).toBe(400);
    });

    it('should reject content over 1000 chars', async () => {
      const user1 = await createTestUser({ username: 'long_u1' });
      const user2 = await createTestUser({ username: 'long_u2' });

      const createRes = await request(getApp())
        .post('/conversations')
        .set('Authorization', `Bearer ${user1.token}`)
        .send({ type: 'direct', userId: user2.user.id });

      const response = await request(getApp())
        .post(`/conversations/${createRes.body.id}/messages`)
        .set('Authorization', `Bearer ${user1.token}`)
        .send({ content: 'x'.repeat(1001) });

      expect(response.status).toBe(400);
    });

    it('should not allow non-participant to send message', async () => {
      const user1 = await createTestUser({ username: 'nmsg_u1' });
      const user2 = await createTestUser({ username: 'nmsg_u2' });
      const stranger = await createTestUser({ username: 'nmsg_stranger' });

      const createRes = await request(getApp())
        .post('/conversations')
        .set('Authorization', `Bearer ${user1.token}`)
        .send({ type: 'direct', userId: user2.user.id });

      const response = await request(getApp())
        .post(`/conversations/${createRes.body.id}/messages`)
        .set('Authorization', `Bearer ${stranger.token}`)
        .send({ content: 'Intruder!' });

      expect(response.status).toBe(403);
    });
  });

  // ── Get Messages ───────────────────────────────────────────────────

  describe('GET /conversations/:id/messages', () => {
    it('should get message history', async () => {
      const user1 = await createTestUser({ username: 'hist_u1' });
      const user2 = await createTestUser({ username: 'hist_u2' });

      const createRes = await request(getApp())
        .post('/conversations')
        .set('Authorization', `Bearer ${user1.token}`)
        .send({ type: 'direct', userId: user2.user.id });

      // Send several messages
      for (let i = 0; i < 5; i++) {
        await request(getApp())
          .post(`/conversations/${createRes.body.id}/messages`)
          .set('Authorization', `Bearer ${user1.token}`)
          .send({ content: `Message ${i}` });
      }

      const response = await request(getApp())
        .get(`/conversations/${createRes.body.id}/messages`)
        .set('Authorization', `Bearer ${user1.token}`);

      expect(response.status).toBe(200);
      expect(response.body).toHaveLength(5);
    });

    it('should support limit-based pagination', async () => {
      const user1 = await createTestUser({ username: 'cur_u1' });
      const user2 = await createTestUser({ username: 'cur_u2' });

      const createRes = await request(getApp())
        .post('/conversations')
        .set('Authorization', `Bearer ${user1.token}`)
        .send({ type: 'direct', userId: user2.user.id });

      for (let i = 0; i < 5; i++) {
        await request(getApp())
          .post(`/conversations/${createRes.body.id}/messages`)
          .set('Authorization', `Bearer ${user1.token}`)
          .send({ content: `Message ${i}` });
      }

      // Get limited messages
      const page1 = await request(getApp())
        .get(`/conversations/${createRes.body.id}/messages?limit=3`)
        .set('Authorization', `Bearer ${user1.token}`);

      expect(page1.status).toBe(200);
      expect(page1.body).toHaveLength(3);

      // All messages
      const all = await request(getApp())
        .get(`/conversations/${createRes.body.id}/messages?limit=50`)
        .set('Authorization', `Bearer ${user1.token}`);

      expect(all.status).toBe(200);
      expect(all.body).toHaveLength(5);
    });

    it('should return messages with sender info', async () => {
      const user1 = await createTestUser({ username: 'aft_u1' });
      const user2 = await createTestUser({ username: 'aft_u2' });

      const createRes = await request(getApp())
        .post('/conversations')
        .set('Authorization', `Bearer ${user1.token}`)
        .send({ type: 'direct', userId: user2.user.id });

      for (let i = 0; i < 3; i++) {
        await request(getApp())
          .post(`/conversations/${createRes.body.id}/messages`)
          .set('Authorization', `Bearer ${user1.token}`)
          .send({ content: `Message ${i}` });
      }

      const response = await request(getApp())
        .get(`/conversations/${createRes.body.id}/messages`)
        .set('Authorization', `Bearer ${user1.token}`);

      expect(response.status).toBe(200);
      expect(response.body).toHaveLength(3);
      // Each message should have sender info
      expect(response.body[0].sender).toBeDefined();
      expect(response.body[0].sender.id).toBe(user1.user.id);
    });

    it('should not allow non-participant to view messages', async () => {
      const user1 = await createTestUser({ username: 'view_u1' });
      const user2 = await createTestUser({ username: 'view_u2' });
      const stranger = await createTestUser({ username: 'view_stranger2' });

      const createRes = await request(getApp())
        .post('/conversations')
        .set('Authorization', `Bearer ${user1.token}`)
        .send({ type: 'direct', userId: user2.user.id });

      const response = await request(getApp())
        .get(`/conversations/${createRes.body.id}/messages`)
        .set('Authorization', `Bearer ${stranger.token}`);

      expect(response.status).toBe(403);
    });
  });

  // ── Edit Message ───────────────────────────────────────────────────

  describe('PATCH /conversations/:id/messages/:messageId', () => {
    it('should edit own message', async () => {
      const user1 = await createTestUser({ username: 'edit_u1' });
      const user2 = await createTestUser({ username: 'edit_u2' });

      const createRes = await request(getApp())
        .post('/conversations')
        .set('Authorization', `Bearer ${user1.token}`)
        .send({ type: 'direct', userId: user2.user.id });

      const msgRes = await request(getApp())
        .post(`/conversations/${createRes.body.id}/messages`)
        .set('Authorization', `Bearer ${user1.token}`)
        .send({ content: 'Original message' });

      const response = await request(getApp())
        .patch(`/conversations/${createRes.body.id}/messages/${msgRes.body.id}`)
        .set('Authorization', `Bearer ${user1.token}`)
        .send({ content: 'Edited message' });

      expect(response.status).toBe(200);
      expect(response.body.content).toBe('Edited message');
      expect(response.body.edited_at).toBeDefined();
    });

    it('should not allow editing others message', async () => {
      const user1 = await createTestUser({ username: 'edit_u3' });
      const user2 = await createTestUser({ username: 'edit_u4' });

      const createRes = await request(getApp())
        .post('/conversations')
        .set('Authorization', `Bearer ${user1.token}`)
        .send({ type: 'direct', userId: user2.user.id });

      const msgRes = await request(getApp())
        .post(`/conversations/${createRes.body.id}/messages`)
        .set('Authorization', `Bearer ${user1.token}`)
        .send({ content: 'My message' });

      const response = await request(getApp())
        .patch(`/conversations/${createRes.body.id}/messages/${msgRes.body.id}`)
        .set('Authorization', `Bearer ${user2.token}`)
        .send({ content: 'Hacked!' });

      expect(response.status).toBe(400);
      expect(response.body.error).toContain('own');
    });
  });

  // ── Delete Message ─────────────────────────────────────────────────

  describe('DELETE /conversations/:id/messages/:messageId', () => {
    it('should soft delete own message', async () => {
      const user1 = await createTestUser({ username: 'del_u1' });
      const user2 = await createTestUser({ username: 'del_u2' });

      const createRes = await request(getApp())
        .post('/conversations')
        .set('Authorization', `Bearer ${user1.token}`)
        .send({ type: 'direct', userId: user2.user.id });

      const msgRes = await request(getApp())
        .post(`/conversations/${createRes.body.id}/messages`)
        .set('Authorization', `Bearer ${user1.token}`)
        .send({ content: 'Delete me' });

      const response = await request(getApp())
        .delete(`/conversations/${createRes.body.id}/messages/${msgRes.body.id}`)
        .set('Authorization', `Bearer ${user1.token}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);

      // Verify message no longer appears in history
      const historyRes = await request(getApp())
        .get(`/conversations/${createRes.body.id}/messages`)
        .set('Authorization', `Bearer ${user1.token}`);

      expect(historyRes.body).toHaveLength(0);
    });

    it('should not allow deleting others message', async () => {
      const user1 = await createTestUser({ username: 'del_u3' });
      const user2 = await createTestUser({ username: 'del_u4' });

      const createRes = await request(getApp())
        .post('/conversations')
        .set('Authorization', `Bearer ${user1.token}`)
        .send({ type: 'direct', userId: user2.user.id });

      const msgRes = await request(getApp())
        .post(`/conversations/${createRes.body.id}/messages`)
        .set('Authorization', `Bearer ${user1.token}`)
        .send({ content: 'Cannot delete this' });

      const response = await request(getApp())
        .delete(`/conversations/${createRes.body.id}/messages/${msgRes.body.id}`)
        .set('Authorization', `Bearer ${user2.token}`);

      expect(response.status).toBe(400);
      expect(response.body.error).toContain('own');
    });
  });

  // ── Mark as Read ───────────────────────────────────────────────────

  describe('POST /conversations/:id/read', () => {
    it('should mark conversation as read', async () => {
      const user1 = await createTestUser({ username: 'read_u1' });
      const user2 = await createTestUser({ username: 'read_u2' });

      const createRes = await request(getApp())
        .post('/conversations')
        .set('Authorization', `Bearer ${user1.token}`)
        .send({ type: 'direct', userId: user2.user.id });

      // Send a message from user2
      await request(getApp())
        .post(`/conversations/${createRes.body.id}/messages`)
        .set('Authorization', `Bearer ${user2.token}`)
        .send({ content: 'Hello!' });

      const response = await request(getApp())
        .post(`/conversations/${createRes.body.id}/read`)
        .set('Authorization', `Bearer ${user1.token}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });

    it('should not allow non-participant to mark read', async () => {
      const user1 = await createTestUser({ username: 'read_u3' });
      const user2 = await createTestUser({ username: 'read_u4' });
      const stranger = await createTestUser({ username: 'read_stranger' });

      const createRes = await request(getApp())
        .post('/conversations')
        .set('Authorization', `Bearer ${user1.token}`)
        .send({ type: 'direct', userId: user2.user.id });

      const response = await request(getApp())
        .post(`/conversations/${createRes.body.id}/read`)
        .set('Authorization', `Bearer ${stranger.token}`);

      expect(response.status).toBe(403);
    });
  });

  // ── Update Group Conversation ──────────────────────────────────────

  describe('PATCH /conversations/:id', () => {
    it('should update group name as admin', async () => {
      const admin = await createTestUser({ username: 'upd_admin' });
      const member = await createTestUser({ username: 'upd_member' });

      const createRes = await request(getApp())
        .post('/conversations')
        .set('Authorization', `Bearer ${admin.token}`)
        .send({ type: 'group', userIds: [member.user.id], name: 'Original Name' });

      const response = await request(getApp())
        .patch(`/conversations/${createRes.body.id}`)
        .set('Authorization', `Bearer ${admin.token}`)
        .send({ name: 'Updated Name' });

      expect(response.status).toBe(200);
      expect(response.body.name).toBe('Updated Name');
    });

    it('should not allow member to update group name', async () => {
      const admin = await createTestUser({ username: 'upd_admin2' });
      const member = await createTestUser({ username: 'upd_member2' });

      const createRes = await request(getApp())
        .post('/conversations')
        .set('Authorization', `Bearer ${admin.token}`)
        .send({ type: 'group', userIds: [member.user.id], name: 'Group' });

      const response = await request(getApp())
        .patch(`/conversations/${createRes.body.id}`)
        .set('Authorization', `Bearer ${member.token}`)
        .send({ name: 'Hacked Name' });

      expect(response.status).toBe(403);
      expect(response.body.error).toContain('admin');
    });

    it('should not allow updating direct conversation', async () => {
      const user1 = await createTestUser({ username: 'upd_dm1' });
      const user2 = await createTestUser({ username: 'upd_dm2' });

      const createRes = await request(getApp())
        .post('/conversations')
        .set('Authorization', `Bearer ${user1.token}`)
        .send({ type: 'direct', userId: user2.user.id });

      const response = await request(getApp())
        .patch(`/conversations/${createRes.body.id}`)
        .set('Authorization', `Bearer ${user1.token}`)
        .send({ name: 'Nope' });

      expect(response.status).toBe(403);
    });
  });

  // ── Add Participant ────────────────────────────────────────────────

  describe('POST /conversations/:id/participants', () => {
    it('should add participant to group as admin', async () => {
      const admin = await createTestUser({ username: 'add_admin' });
      const member = await createTestUser({ username: 'add_member' });
      const newMember = await createTestUser({ username: 'add_new' });

      const createRes = await request(getApp())
        .post('/conversations')
        .set('Authorization', `Bearer ${admin.token}`)
        .send({ type: 'group', userIds: [member.user.id], name: 'Addable Group' });

      const response = await request(getApp())
        .post(`/conversations/${createRes.body.id}/participants`)
        .set('Authorization', `Bearer ${admin.token}`)
        .send({ userId: newMember.user.id });

      expect(response.status).toBe(200);
      expect(response.body.participants).toHaveLength(3);
    });

    it('should not allow member to add participant', async () => {
      const admin = await createTestUser({ username: 'add_admin2' });
      const member = await createTestUser({ username: 'add_member2' });
      const newMember = await createTestUser({ username: 'add_new2' });

      const createRes = await request(getApp())
        .post('/conversations')
        .set('Authorization', `Bearer ${admin.token}`)
        .send({ type: 'group', userIds: [member.user.id], name: 'No Add Group' });

      const response = await request(getApp())
        .post(`/conversations/${createRes.body.id}/participants`)
        .set('Authorization', `Bearer ${member.token}`)
        .send({ userId: newMember.user.id });

      expect(response.status).toBe(400);
      expect(response.body.error).toContain('admin');
    });

    it('should not add to direct conversation', async () => {
      const user1 = await createTestUser({ username: 'add_dm1' });
      const user2 = await createTestUser({ username: 'add_dm2' });
      const newMember = await createTestUser({ username: 'add_dm3' });

      const createRes = await request(getApp())
        .post('/conversations')
        .set('Authorization', `Bearer ${user1.token}`)
        .send({ type: 'direct', userId: user2.user.id });

      const response = await request(getApp())
        .post(`/conversations/${createRes.body.id}/participants`)
        .set('Authorization', `Bearer ${user1.token}`)
        .send({ userId: newMember.user.id });

      expect(response.status).toBe(400);
      expect(response.body.error).toContain('group');
    });

    it('should not add duplicate participant', async () => {
      const admin = await createTestUser({ username: 'dup_admin' });
      const member = await createTestUser({ username: 'dup_member' });

      const createRes = await request(getApp())
        .post('/conversations')
        .set('Authorization', `Bearer ${admin.token}`)
        .send({ type: 'group', userIds: [member.user.id], name: 'Dup Group' });

      const response = await request(getApp())
        .post(`/conversations/${createRes.body.id}/participants`)
        .set('Authorization', `Bearer ${admin.token}`)
        .send({ userId: member.user.id });

      expect(response.status).toBe(400);
      expect(response.body.error).toContain('already');
    });
  });

  // ── Remove Participant ─────────────────────────────────────────────

  describe('DELETE /conversations/:id/participants/:userId', () => {
    it('should remove participant as admin', async () => {
      const admin = await createTestUser({ username: 'rem_admin' });
      const member = await createTestUser({ username: 'rem_member' });

      const createRes = await request(getApp())
        .post('/conversations')
        .set('Authorization', `Bearer ${admin.token}`)
        .send({ type: 'group', userIds: [member.user.id], name: 'Removable Group' });

      const response = await request(getApp())
        .delete(`/conversations/${createRes.body.id}/participants/${member.user.id}`)
        .set('Authorization', `Bearer ${admin.token}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });

    it('should allow self-leave from group', async () => {
      const admin = await createTestUser({ username: 'leave_admin' });
      const member = await createTestUser({ username: 'leave_member' });

      const createRes = await request(getApp())
        .post('/conversations')
        .set('Authorization', `Bearer ${admin.token}`)
        .send({ type: 'group', userIds: [member.user.id], name: 'Leave Group' });

      const response = await request(getApp())
        .delete(`/conversations/${createRes.body.id}/participants/${member.user.id}`)
        .set('Authorization', `Bearer ${member.token}`);

      expect(response.status).toBe(200);
    });

    it('should not allow member to remove others', async () => {
      const admin = await createTestUser({ username: 'nrem_admin' });
      const member1 = await createTestUser({ username: 'nrem_m1' });
      const member2 = await createTestUser({ username: 'nrem_m2' });

      const createRes = await request(getApp())
        .post('/conversations')
        .set('Authorization', `Bearer ${admin.token}`)
        .send({ type: 'group', userIds: [member1.user.id, member2.user.id], name: 'No Remove Group' });

      const response = await request(getApp())
        .delete(`/conversations/${createRes.body.id}/participants/${member2.user.id}`)
        .set('Authorization', `Bearer ${member1.token}`);

      expect(response.status).toBe(400);
      expect(response.body.error).toContain('admin');
    });

    it('should not remove from direct conversation', async () => {
      const user1 = await createTestUser({ username: 'rem_dm1' });
      const user2 = await createTestUser({ username: 'rem_dm2' });

      const createRes = await request(getApp())
        .post('/conversations')
        .set('Authorization', `Bearer ${user1.token}`)
        .send({ type: 'direct', userId: user2.user.id });

      const response = await request(getApp())
        .delete(`/conversations/${createRes.body.id}/participants/${user2.user.id}`)
        .set('Authorization', `Bearer ${user1.token}`);

      expect(response.status).toBe(400);
      expect(response.body.error).toContain('group');
    });
  });

  // ── Block check bidirectional ──────────────────────────────────────

  describe('Bidirectional block check', () => {
    it('should prevent DM if target blocked the requester', async () => {
      const user1 = await createTestUser({ username: 'bi_blocker' });
      const user2 = await createTestUser({ username: 'bi_blocked' });

      // user2 blocks user1
      await request(getApp())
        .post('/moderation/block')
        .set('Authorization', `Bearer ${user2.token}`)
        .send({ blockedId: user1.user.id });

      // user1 tries to DM user2
      const response = await request(getApp())
        .post('/conversations')
        .set('Authorization', `Bearer ${user1.token}`)
        .send({ type: 'direct', userId: user2.user.id });

      expect(response.status).toBe(400);
      expect(response.body.error).toContain('Cannot');
    });
  });
});
