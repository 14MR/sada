import { AppDataSource } from '../../src/config/database';
import { Room } from '../../src/models/Room';
import { RoomParticipant } from '../../src/models/RoomParticipant';
import { ChatService } from '../../src/services/chat.service';
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
});
