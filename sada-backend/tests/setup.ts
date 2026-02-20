// Empty setup - tests will handle their own database setup
// This file exists to satisfy jest.config.js setupFilesAfterEnv

// Set test environment
process.env.JWT_SECRET = 'test_secret';
process.env.NODE_ENV = 'test';
