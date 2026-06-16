import { getExpressCorsOptions, getSocketCorsOrigin } from "../../src/config/cors";

describe("CORS configuration", () => {
  const originalEnv = { ...process.env };

  afterEach(() => {
    process.env = { ...originalEnv };
  });

  it("requires explicit origins for Express in production", () => {
    process.env.NODE_ENV = "production";
    delete process.env.CORS_ORIGINS;

    expect(() => getExpressCorsOptions()).toThrow("CORS_ORIGINS must list explicit origins");
  });

  it("rejects wildcard Socket.IO origins in production", () => {
    process.env.NODE_ENV = "production";
    process.env.CORS_ORIGINS = "*";

    expect(() => getSocketCorsOrigin()).toThrow("CORS_ORIGINS must list explicit origins");
  });

  it("parses comma-separated explicit origins", () => {
    process.env.NODE_ENV = "production";
    process.env.CORS_ORIGINS = "https://sada.app, https://admin.sada.app";

    expect(getExpressCorsOptions()).toEqual({
      origin: ["https://sada.app", "https://admin.sada.app"],
    });
    expect(getSocketCorsOrigin()).toEqual(["https://sada.app", "https://admin.sada.app"]);
  });

  it("keeps permissive local defaults outside production", () => {
    process.env.NODE_ENV = "development";
    delete process.env.CORS_ORIGINS;

    expect(getExpressCorsOptions()).toEqual({});
    expect(getSocketCorsOrigin()).toBe("*");
  });
});
