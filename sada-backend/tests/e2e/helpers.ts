import jwt from 'jsonwebtoken';
import supertest from 'supertest';
import { createApp } from '../../src/app';

const JWT_SECRET = process.env.JWT_SECRET || 'test_secret';

export const TEST_USER_ID = 'e2e-test-user-001';
export const TEST_USERNAME = 'e2e_testuser';

export function generateToken(userId: string = TEST_USER_ID): string {
  return jwt.sign({ id: userId, username: TEST_USERNAME }, JWT_SECRET, { expiresIn: '1h' });
}

export function createTestApp() {
  return supertest(createApp());
}

export function authHeader(token?: string): Record<string, string> {
  return { Authorization: `Bearer ${token ?? generateToken()}` };
}
