import { createTestApp, authHeader, generateToken, TEST_USER_ID } from './helpers';

const request = createTestApp();

describe('E2E - Health & Auth', () => {
  describe('GET /health', () => {
    it('should return 200 with status ok', async () => {
      const res = await request.get('/health');
      expect(res.status).toBe(200);
      expect(res.body).toEqual({ status: 'ok' });
    });
  });

  describe('Protected endpoints without token', () => {
    it('should return 401 when accessing /withdrawals without token', async () => {
      const res = await request.get('/withdrawals');
      expect(res.status).toBe(401);
    });

    it('should return 401 when accessing /reactions without token', async () => {
      const res = await request.post('/reactions').send({});
      expect(res.status).toBe(401);
    });

    it('should return 401 with an invalid token', async () => {
      const res = await request
        .get('/withdrawals')
        .set('Authorization', 'Bearer invalid.token.here');
      expect(res.status).toBe(401);
    });
  });

  describe('Protected endpoints with valid token', () => {
    it('should return 401 for a malformed (non-Bearer) Authorization header', async () => {
      const res = await request
        .get('/withdrawals')
        .set('Authorization', generateToken());
      expect(res.status).toBe(401);
    });

    it('should accept valid token on a protected route (DB-dependent, may get 500)', async () => {
      const res = await request
        .get('/withdrawals')
        .set(authHeader());
      // With valid auth: route runs but may fail at DB layer (500) or succeed (200)
      // We only assert it did NOT reject auth
      expect(res.status).not.toBe(401);
    });

    it('should accept valid token on /reactions POST (DB-dependent, may get 500)', async () => {
      const res = await request
        .post('/reactions')
        .set(authHeader())
        .send({ targetType: 'room', targetId: 'room-1', emoji: '👍' });
      expect(res.status).not.toBe(401);
    });
  });
});
