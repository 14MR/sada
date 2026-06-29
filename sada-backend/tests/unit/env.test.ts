describe('production environment validation', () => {
  const originalEnv = { ...process.env };

  afterEach(() => {
    jest.resetModules();
    process.env = { ...originalEnv };
  });

  function setBaseProductionEnv() {
    process.env = {
      ...originalEnv,
      NODE_ENV: 'production',
      CLOUDFLARE_APP_ID: 'cf-app',
      CLOUDFLARE_TURN_KEY_ID: 'cf-turn',
      CLOUDFLARE_API_TOKEN: 'cf-token',
      CLOUDFLARE_APP_SECRET: 'cf-secret',
      ADMIN_KEY: 'admin-key',
      APPLE_BUNDLE_ID: 'com.sada.app',
    };
  }

  it('requires ADMIN_KEY at startup in production', () => {
    setBaseProductionEnv();
    delete process.env.ADMIN_KEY;

    expect(() => require('../../src/config/env')).toThrow(
      'Missing required environment variable: ADMIN_KEY',
    );
  });

  it('requires APPLE_BUNDLE_ID at startup in production', () => {
    setBaseProductionEnv();
    delete process.env.APPLE_BUNDLE_ID;

    expect(() => require('../../src/config/env')).toThrow(
      'Missing required environment variable: APPLE_BUNDLE_ID',
    );
  });

  it('loads required production env when configured', () => {
    setBaseProductionEnv();

    const { vars } = require('../../src/config/env');

    expect(vars.admin.key).toBe('admin-key');
    expect(vars.apple.bundleId).toBe('com.sada.app');
  });
});
