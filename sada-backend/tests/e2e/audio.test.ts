/**
 * Tests for the Cloudflare Calls SFU audio system.
 * Covers: CallsService, AudioController endpoints, host verification, socket events.
 */
import request from 'supertest';
import { CallsService } from '../../src/services/calls.service';
import { generateToken } from './helpers';
import { ChatService } from '../../src/services/chat.service';
import { RoomService } from '../../src/services/room.service';
import { createApp } from '../../src/app';
import { AppDataSource } from './testDb';

// ─── Mocks ───────────────────────────────────────────────────────────────────

jest.mock('../../src/config/database', () => require('./testDb'));

const mockFetch = jest.fn();
global.fetch = mockFetch;

jest.mock('../../src/services/room.service', () => ({
    RoomService: { getRoom: jest.fn() },
}));

jest.mock('../../src/services/chat.service');

let app: any;

// ─── Constants ───────────────────────────────────────────────────────────────

const CF_SESSION_ID = 'cf-session-123';
const CF_TRACK_ID = 'cf-track-456';
const CF_MID = '0';
const CF_ANSWER_SDP = 'v=0\r\no=- 123 1 IN IP4 0.0.0.0\r\ns=-\r\nt=0 0\r\n';
const ROOM_ID = 'room-abc';
const HOST_USER_ID = 'host-user-1';
const LISTENER_USER_ID = 'listener-user-1';

// ─── Helpers ─────────────────────────────────────────────────────────────────

function mockCfCreateSession() {
    mockFetch.mockResolvedValueOnce({ ok: true, json: async () => ({ sessionId: CF_SESSION_ID }) });
}

function mockCfCreateTrack() {
    mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
            sessionDescription: { sdp: CF_ANSWER_SDP, type: 'answer' },
            trackId: CF_TRACK_ID,
            mid: CF_MID,
        }),
    });
}

function mockCfDeleteSession() {
    mockFetch.mockResolvedValueOnce({ ok: true });
}

function mockCfIceServers() {
    mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ iceServers: [{ urls: 'stun:stun.l.google.com:19302' }] }),
    });
}

function hostAuth() { return generateToken(HOST_USER_ID, 'host'); }
function listenerAuth() { return generateToken(LISTENER_USER_ID, 'listener'); }

/** Create a mock ChatService instance with a spyable emitToRoom */
function setupChatMock() {
    const mockEmitToRoom = jest.fn();
    (ChatService.getInstance as jest.Mock).mockReturnValue({
        emitToRoom: mockEmitToRoom,
        sendToUser: jest.fn(),
    });
    return mockEmitToRoom;
}

async function createSessionSetup() {
    (RoomService.getRoom as jest.Mock).mockResolvedValueOnce({
        id: ROOM_ID, host: { id: HOST_USER_ID },
    });
    mockCfCreateSession();
    mockCfIceServers();
    const res = await request(app)
        .post('/audio/sessions')
        .set('Authorization', `Bearer ${hostAuth()}`)
        .send({ roomId: ROOM_ID });

    // Host joins as participant
    mockCfCreateTrack();
    await request(app)
        .post(`/audio/sessions/${CF_SESSION_ID}/join`)
        .set('Authorization', `Bearer ${hostAuth()}`)
        .send({ offerSdp: 'host-offer-sdp', role: 'host' });

    return res;
}

async function joinSessionSetup() {
    mockCfCreateTrack();
    return request(app)
        .post(`/audio/sessions/${CF_SESSION_ID}/join`)
        .set('Authorization', `Bearer ${listenerAuth()}`)
        .send({ offerSdp: 'v=0\r\noffer-sdp', role: 'listener' });
}

// ─── Setup ───────────────────────────────────────────────────────────────────

beforeAll(async () => {
    if (!AppDataSource.isInitialized) await AppDataSource.initialize();
    app = createApp();
});

beforeEach(() => {
    CallsService._reset();
    mockFetch.mockReset();
    (ChatService.getInstance as jest.Mock).mockReset();
    (RoomService.getRoom as jest.Mock).mockReset();
});

// ─── CallsService unit tests ─────────────────────────────────────────────────

describe('CallsService', () => {
    it('should create a session via Cloudflare API', async () => {
        mockCfCreateSession();
        const session = await CallsService.createSession(ROOM_ID, HOST_USER_ID);
        expect(session.sessionId).toBe(CF_SESSION_ID);
        expect(session.roomId).toBe(ROOM_ID);
        expect(session.hostId).toBe(HOST_USER_ID);
        expect(session.participants.size).toBe(0);
        expect(mockFetch).toHaveBeenCalledTimes(1);
        expect(mockFetch.mock.calls[0][0]).toContain('/sessions/new');
    });

    it('should reuse existing session for same room', async () => {
        mockCfCreateSession();
        const s1 = await CallsService.createSession(ROOM_ID, HOST_USER_ID);
        const s2 = await CallsService.createSession(ROOM_ID, HOST_USER_ID);
        expect(s1.sessionId).toBe(s2.sessionId);
        expect(mockFetch).toHaveBeenCalledTimes(1);
    });

    it('should create track with correct body format (tracks array)', async () => {
        mockCfCreateSession();
        await CallsService.createSession(ROOM_ID, HOST_USER_ID);

        mockCfCreateTrack();
        const result = await CallsService.createTrack(CF_SESSION_ID, LISTENER_USER_ID, 'offer-sdp', 'listener');

        expect(result.answer.trackId).toBe(CF_TRACK_ID);
        expect(result.session.participants.size).toBe(1);
        expect(result.session.participants.get(LISTENER_USER_ID)?.isMuted).toBe(false);

        const body = JSON.parse(mockFetch.mock.calls[1][1].body);
        expect(body.tracks).toEqual([{ location: 'local', trackName: 'audio' }]);
        expect(body.mediaTypes).toBeUndefined();
    });

    it('should throw for nonexistent session', async () => {
        await expect(
            CallsService.createTrack('nonexistent', 'user-1', 'sdp', 'listener'),
        ).rejects.toThrow('not found');
    });

    it('should destroy session when host leaves', async () => {
        mockCfCreateSession();
        await CallsService.createSession(ROOM_ID, HOST_USER_ID);
        mockCfCreateTrack();
        await CallsService.createTrack(CF_SESSION_ID, HOST_USER_ID, 'sdp', 'host');
        mockCfCreateTrack();
        await CallsService.createTrack(CF_SESSION_ID, LISTENER_USER_ID, 'sdp', 'listener');

        mockCfDeleteSession();
        const result = await CallsService.leaveSession(CF_SESSION_ID, HOST_USER_ID);
        expect(result.sessionEnded).toBe(true);
        expect(CallsService.getSessionByRoom(ROOM_ID)).toBeUndefined();
    });

    it('should keep session when non-host leaves', async () => {
        mockCfCreateSession();
        await CallsService.createSession(ROOM_ID, HOST_USER_ID);
        mockCfCreateTrack();
        await CallsService.createTrack(CF_SESSION_ID, HOST_USER_ID, 'sdp', 'host');
        mockCfCreateTrack();
        await CallsService.createTrack(CF_SESSION_ID, LISTENER_USER_ID, 'sdp', 'listener');

        const result = await CallsService.leaveSession(CF_SESSION_ID, LISTENER_USER_ID);
        expect(result.sessionEnded).toBe(false);
    });

    it('should update mute state', async () => {
        mockCfCreateSession();
        await CallsService.createSession(ROOM_ID, HOST_USER_ID);
        mockCfCreateTrack();
        await CallsService.createTrack(CF_SESSION_ID, LISTENER_USER_ID, 'sdp', 'speaker');

        CallsService.setMuteState(CF_SESSION_ID, LISTENER_USER_ID, true);
        const p = CallsService.getParticipants(CF_SESSION_ID);
        expect(p.find(x => x.userId === LISTENER_USER_ID)?.isMuted).toBe(true);
    });

    it('should use PUT /renegotiate for renegotiation', async () => {
        mockCfCreateSession();
        await CallsService.createSession(ROOM_ID, HOST_USER_ID);
        mockCfCreateTrack();
        await CallsService.createTrack(CF_SESSION_ID, HOST_USER_ID, 'sdp', 'host');

        mockFetch.mockResolvedValueOnce({
            ok: true,
            json: async () => ({
                sessionDescription: { sdp: CF_ANSWER_SDP, type: 'answer' },
                trackId: CF_TRACK_ID, mid: CF_MID,
            }),
        });

        await CallsService.renegotiateTrack(CF_SESSION_ID, HOST_USER_ID, 'new-sdp');
        const call = mockFetch.mock.calls[mockFetch.mock.calls.length - 1];
        expect(call[1].method).toBe('PUT');
        expect(call[0]).toContain('/renegotiate');
    });

    it('should handle Cloudflare API errors', async () => {
        mockFetch.mockResolvedValueOnce({ ok: false, status: 500, text: async () => 'Error' });
        await expect(CallsService.createSession('fail', HOST_USER_ID)).rejects.toThrow();
    });
});

// ─── AudioController endpoint tests ──────────────────────────────────────────

describe('POST /audio/sessions', () => {
    it('should reject unauthenticated users', async () => {
        const res = await request(app).post('/audio/sessions').send({ roomId: ROOM_ID });
        expect(res.status).toBe(401);
    });

    it('should reject non-host users (403)', async () => {
        (RoomService.getRoom as jest.Mock).mockResolvedValueOnce({ id: ROOM_ID, host: { id: HOST_USER_ID } });
        const res = await request(app)
            .post('/audio/sessions')
            .set('Authorization', `Bearer ${listenerAuth()}`)
            .send({ roomId: ROOM_ID });
        expect(res.status).toBe(403);
    });

    it('should return 404 for nonexistent room', async () => {
        (RoomService.getRoom as jest.Mock).mockResolvedValueOnce(null);
        const res = await request(app)
            .post('/audio/sessions')
            .set('Authorization', `Bearer ${hostAuth()}`)
            .send({ roomId: 'nope' });
        expect(res.status).toBe(404);
    });

    it('should create session for room host', async () => {
        setupChatMock();
        const res = await createSessionSetup();
        expect(res.status).toBe(201);
        expect(res.body.sessionId).toBe(CF_SESSION_ID);
        expect(res.body.iceServers).toBeDefined();
    });
});

describe('POST /audio/sessions/:sessionId/join', () => {
    it('should reject unauthenticated', async () => {
        const res = await request(app).post(`/audio/sessions/${CF_SESSION_ID}/join`).send({ offerSdp: 'sdp' });
        expect(res.status).toBe(401);
    });

    it('should 404 for nonexistent session', async () => {
        setupChatMock();
        const res = await request(app)
            .post('/audio/sessions/nope/join')
            .set('Authorization', `Bearer ${listenerAuth()}`)
            .send({ offerSdp: 'sdp', role: 'listener' });
        expect(res.status).toBe(404);
    });

    it('should join and return answer SDP', async () => {
        setupChatMock();
        await createSessionSetup();
        const res = await joinSessionSetup();
        expect(res.status).toBe(200);
        expect(res.body.answerSdp).toBe(CF_ANSWER_SDP);
        expect(res.body.trackId).toBe(CF_TRACK_ID);
    });

    it('should emit participant_update on join', async () => {
        const mockEmit = setupChatMock();
        await createSessionSetup();
        await joinSessionSetup();
        expect(mockEmit).toHaveBeenCalledWith(
            ROOM_ID, 'participant_update',
            expect.objectContaining({ speakers: expect.any(Array), listeners: expect.any(Array) }),
        );
    });
});

describe('POST /audio/sessions/:sessionId/leave', () => {
    it('should leave session', async () => {
        setupChatMock();
        await createSessionSetup();
        await joinSessionSetup();

        const res = await request(app)
            .post(`/audio/sessions/${CF_SESSION_ID}/leave`)
            .set('Authorization', `Bearer ${listenerAuth()}`)
            .send({});
        expect(res.status).toBe(200);
        expect(res.body.success).toBe(true);
        expect(res.body.sessionEnded).toBe(false);
    });

    it('should emit participant_update on leave', async () => {
        const mockEmit = setupChatMock();
        await createSessionSetup();
        await joinSessionSetup();
        mockEmit.mockClear();

        await request(app)
            .post(`/audio/sessions/${CF_SESSION_ID}/leave`)
            .set('Authorization', `Bearer ${listenerAuth()}`)
            .send({});

        expect(mockEmit).toHaveBeenCalledWith(ROOM_ID, 'participant_update', expect.any(Object));
    });
});

describe('POST /audio/sessions/:sessionId/mute', () => {
    it('should update mute state', async () => {
        setupChatMock();
        await createSessionSetup();
        await joinSessionSetup();

        const res = await request(app)
            .post(`/audio/sessions/${CF_SESSION_ID}/mute`)
            .set('Authorization', `Bearer ${listenerAuth()}`)
            .send({ muted: true });
        expect(res.status).toBe(200);

        const p = CallsService.getParticipants(CF_SESSION_ID);
        expect(p.find(x => x.userId === LISTENER_USER_ID)?.isMuted).toBe(true);
    });

    it('should emit participant_update on mute', async () => {
        const mockEmit = setupChatMock();
        await createSessionSetup();
        await joinSessionSetup();
        mockEmit.mockClear();

        await request(app)
            .post(`/audio/sessions/${CF_SESSION_ID}/mute`)
            .set('Authorization', `Bearer ${listenerAuth()}`)
            .send({ muted: true });

        expect(mockEmit).toHaveBeenCalledWith(ROOM_ID, 'participant_update', expect.any(Object));
    });
});

describe('GET /audio/sessions/room/:roomId', () => {
    it('should return 404 if no session', async () => {
        const res = await request(app)
            .get('/audio/sessions/room/nope')
            .set('Authorization', `Bearer ${hostAuth()}`);
        expect(res.status).toBe(404);
    });

    it('should return session info', async () => {
        setupChatMock();
        await createSessionSetup();
        const res = await request(app)
            .get(`/audio/sessions/room/${ROOM_ID}`)
            .set('Authorization', `Bearer ${hostAuth()}`);
        expect(res.status).toBe(200);
        expect(res.body.sessionId).toBe(CF_SESSION_ID);
        expect(res.body.participantCount).toBe(1);
    });
});

describe('GET /audio/sessions/:sessionId/participants', () => {
    it('should list participants', async () => {
        setupChatMock();
        await createSessionSetup();
        await joinSessionSetup();
        const res = await request(app)
            .get(`/audio/sessions/${CF_SESSION_ID}/participants`)
            .set('Authorization', `Bearer ${hostAuth()}`);
        expect(res.status).toBe(200);
        expect(res.body.participants.length).toBe(2);
    });
});
