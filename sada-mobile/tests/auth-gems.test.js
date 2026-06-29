const assert = require('node:assert/strict');
const test = require('node:test');
const { createAuthService, getLoginErrorMessage } = require('../dist-unit/api/authCore');
const { createGemService } = require('../dist-unit/api/gemsCore');

const createMemoryStore = (initial = {}) => {
  const values = new Map(Object.entries(initial));
  const calls = [];

  return {
    calls,
    async setItemAsync(key, value) {
      calls.push(['set', key, value]);
      values.set(key, value);
    },
    async getItemAsync(key) {
      calls.push(['get', key]);
      return values.get(key) || null;
    },
    async deleteItemAsync(key) {
      calls.push(['delete', key]);
      values.delete(key);
    },
  };
};

test('AuthService.signIn posts the Apple identity token and persists auth state', async () => {
  const user = {
    id: 'user-1',
    username: 'tim',
    display_name: 'Tim',
    avatar_url: null,
    bio: null,
    gem_balance: 100,
  };
  const requests = [];
  const client = {
    async post(url, body) {
      requests.push({ method: 'post', url, body });
      return { data: { token: 'jwt-token', user } };
    },
    async get() {
      throw new Error('unexpected get');
    },
  };
  const store = createMemoryStore();
  const auth = createAuthService(client, store);

  const response = await auth.signIn('apple-identity-token', 'Tim Mustafin');

  assert.equal(response.token, 'jwt-token');
  assert.deepEqual(requests, [{
    method: 'post',
    url: '/auth/signin',
    body: {
      identityToken: 'apple-identity-token',
      fullName: 'Tim Mustafin',
    },
  }]);
  assert.deepEqual(store.calls, [
    ['set', 'auth_token', 'jwt-token'],
    ['set', 'user_profile', JSON.stringify(user)],
  ]);
});

test('AuthService.signOut clears auth token and cached profile', async () => {
  const store = createMemoryStore({ auth_token: 'jwt-token', user_profile: '{}' });
  const auth = createAuthService({ post: async () => ({}), get: async () => ({}) }, store);

  await auth.signOut();

  assert.deepEqual(store.calls, [
    ['delete', 'auth_token'],
    ['delete', 'user_profile'],
  ]);
});

test('getLoginErrorMessage maps auth failures without exposing raw internals', () => {
  const message = getLoginErrorMessage({
    message: 'Invalid Apple Identity Token from https://api.example.test/auth/signin',
    response: { status: 401 },
  });

  assert.equal(message, 'We could not verify your Apple Sign-In. Please try again.');
  assert.equal(message.includes('Invalid Apple Identity Token'), false);
  assert.equal(message.includes('https://'), false);
});

test('getLoginErrorMessage maps network and server failures to user-safe copy', () => {
  assert.equal(
    getLoginErrorMessage({ code: 'ERR_NETWORK', message: 'Network Error' }),
    'Please check your connection and try again.',
  );
  assert.equal(
    getLoginErrorMessage({ response: { status: 503 }, message: 'database connection failed' }),
    'SADA is having trouble signing you in right now. Please try again soon.',
  );
});

test('GemService.getBalance requires a stored user id', async () => {
  const gems = createGemService(
    { get: async () => ({ data: {} }), post: async () => ({ data: {} }) },
    createMemoryStore(),
  );

  await assert.rejects(() => gems.getBalance(), /Not authenticated/);
});

test('GemService.getBalance reads the authenticated user balance endpoint', async () => {
  const requests = [];
  const gems = createGemService(
    {
      async get(url) {
        requests.push({ method: 'get', url });
        return { data: { balance: 550 } };
      },
      async post() {
        throw new Error('unexpected post');
      },
    },
    createMemoryStore({ user_id: 'user-1' }),
  );

  const balance = await gems.getBalance();

  assert.deepEqual(balance, { balance: 550 });
  assert.deepEqual(requests, [{ method: 'get', url: '/gems/balance/user-1' }]);
});

test('GemService.purchaseGems sends numeric amount with receipt metadata', async () => {
  const requests = [];
  const gems = createGemService(
    {
      async get() {
        throw new Error('unexpected get');
      },
      async post(url, body) {
        requests.push({ method: 'post', url, body });
        return { data: { ok: true } };
      },
    },
    createMemoryStore({ user_id: 'user-1' }),
    { receiptData: 'receipt-123', platform: 'apple' },
  );

  const result = await gems.purchaseGems(550);

  assert.deepEqual(result, { ok: true });
  assert.deepEqual(requests, [{
    method: 'post',
    url: '/gems/purchase',
    body: {
      amount: 550,
      receiptData: 'receipt-123',
      platform: 'apple',
    },
  }]);
  assert.equal(Object.prototype.hasOwnProperty.call(requests[0].body, 'packageId'), false);
});

test('GemService.purchaseGems does not invent a mock receipt', async () => {
  const requests = [];
  const gems = createGemService(
    {
      async get() {
        throw new Error('unexpected get');
      },
      async post(url, body) {
        requests.push({ method: 'post', url, body });
        return { data: { ok: true } };
      },
    },
    createMemoryStore({ user_id: 'user-1' }),
  );

  const result = await gems.purchaseGems(100);

  assert.deepEqual(result, { ok: true });
  assert.deepEqual(requests, [{
    method: 'post',
    url: '/gems/purchase',
    body: {
      amount: 100,
    },
  }]);
});
