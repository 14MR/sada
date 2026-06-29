import { AppDataSource } from '../../src/config/database';
import { Room } from '../../src/models/Room';
import { RoomParticipant } from '../../src/models/RoomParticipant';
import {
  ChatService,
  MAX_CHAT_MESSAGE_LENGTH,
  MAX_SIGNAL_PAYLOAD_BYTES,
  isValidChatMessage,
  isValidSignalPayload,
} from '../../src/services/chat.service';
import { clearDatabase, createTestRoom, createTestUser, setupTestDB } from './helpers';

jest.mock('../../src/config/database', () => require('./testDb'));

describe('ChatService room authorization', () => {
  beforeAll(async () => {
    await setupTestDB();
  });

  beforeEach(async () => {
    await clearDatabase();
  });

  async function addParticipant(userId: string, roomId: string, role = 'listener') {
    const participant = new RoomParticipant();
    participant.user_id = userId;
    participant.room_id = roomId;
    participant.role = role;
    return AppDataSource.getRepository(RoomParticipant).save(participant);
  }

  it('allows active room participants to access chat rooms', async () => {
    const host = await createTestUser({ username: 'chat_host' });
    const listener = await createTestUser({ username: 'chat_listener' });
    const room = await createTestRoom(host.user.id);
    await addParticipant(listener.user.id, room.id);

    await expect(ChatService.canAccessRoom(listener.user.id, room.id)).resolves.toBe(true);
  });

  it('denies users who have not joined the room', async () => {
    const host = await createTestUser({ username: 'chat_host' });
    const outsider = await createTestUser({ username: 'chat_outsider' });
    const room = await createTestRoom(host.user.id);

    await expect(ChatService.canAccessRoom(outsider.user.id, room.id)).resolves.toBe(false);
  });

  it('denies access to ended or chat-disabled rooms', async () => {
    const host = await createTestUser({ username: 'chat_host' });
    const listener = await createTestUser({ username: 'chat_listener' });
    const endedRoom = await createTestRoom(host.user.id, { status: 'ended' });
    const mutedRoom = await createTestRoom(host.user.id);
    mutedRoom.chat_enabled = false;
    await AppDataSource.getRepository(Room).save(mutedRoom);

    await addParticipant(listener.user.id, endedRoom.id);
    await addParticipant(listener.user.id, mutedRoom.id);

    await expect(ChatService.canAccessRoom(listener.user.id, endedRoom.id)).resolves.toBe(false);
    await expect(ChatService.canAccessRoom(listener.user.id, mutedRoom.id)).resolves.toBe(false);
  });

  it('bounds chat message payloads', () => {
    expect(isValidChatMessage('hello')).toBe(true);
    expect(isValidChatMessage('')).toBe(false);
    expect(isValidChatMessage('   ')).toBe(false);
    expect(isValidChatMessage('x'.repeat(MAX_CHAT_MESSAGE_LENGTH + 1))).toBe(false);
    expect(isValidChatMessage({ text: 'hello' })).toBe(false);
  });

  it('bounds signaling payloads', () => {
    expect(isValidSignalPayload({ type: 'offer', sdp: 'v=0' })).toBe(true);
    expect(isValidSignalPayload(null)).toBe(false);
    expect(isValidSignalPayload('offer')).toBe(false);
    expect(isValidSignalPayload({ sdp: 'x'.repeat(MAX_SIGNAL_PAYLOAD_BYTES) })).toBe(false);

    const circular: Record<string, unknown> = {};
    circular.self = circular;
    expect(isValidSignalPayload(circular)).toBe(false);
  });
});
