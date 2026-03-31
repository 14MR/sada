import request, { Test } from 'supertest';
import jwt from 'jsonwebtoken';
import { Application } from 'express';
import { createApp } from '../../src/app';
import { AppDataSource } from './testDb';
import { User } from '../../src/models/User';
import { Category } from '../../src/models/Category';
import { Room } from '../../src/models/Room';

let app: Application;

export function getApp(): Application {
  return app;
}

export async function setupTestDB(): Promise<Application> {
  if (!AppDataSource.isInitialized) {
    await AppDataSource.initialize();
  }
  app = createApp();
  return app;
}

export async function teardownTestDB(): Promise<void> {
  if (AppDataSource.isInitialized) {
    await AppDataSource.destroy();
  }
}

export async function clearDatabase(): Promise<void> {
  await AppDataSource.query('PRAGMA foreign_keys = OFF');
  for (const entity of AppDataSource.entityMetadatas) {
    await AppDataSource.query(`DELETE FROM "${entity.tableName}"`);
  }
  await AppDataSource.query('PRAGMA foreign_keys = ON');
}

export function generateToken(userId: string, username: string = 'testuser'): string {
  return jwt.sign(
    { id: userId, username },
    process.env.JWT_SECRET || 'test_secret',
    { expiresIn: '7d' },
  );
}

export async function createTestUser(
  overrides: Record<string, any> = {},
): Promise<{ user: User; token: string }> {
  const repo = AppDataSource.getRepository(User);
  const user = new User();
  user.apple_id = overrides.apple_id || `apple_${Date.now()}_${Math.random().toString(36).slice(2)}`;
  user.username = overrides.username || `user_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  user.display_name = overrides.display_name || 'Test User';
  user.gem_balance = overrides.gem_balance ?? 100;
  user.bio = overrides.bio || null;
  user.avatar_url = overrides.avatar_url || null;
  user.is_creator = overrides.is_creator ?? false;
  user.verified = overrides.verified ?? false;
  user.banned = overrides.banned ?? false;
  user.language = overrides.language || 'en';
  user.twitter_handle = overrides.twitter_handle || null;
  user.instagram_handle = overrides.instagram_handle || null;

  const saved = await repo.save(user);
  const token = generateToken(saved.id, saved.username);
  return { user: saved, token };
}

export async function createTestCategory(
  overrides: Record<string, any> = {},
): Promise<Category> {
  const repo = AppDataSource.getRepository(Category);
  const category = new Category();
  category.name = overrides.name || 'Test Category';
  category.nameAr = overrides.nameAr || 'فئة الاختبار';
  category.slug = overrides.slug || `slug_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  category.icon = overrides.icon || null;
  category.color = overrides.color || null;
  return await repo.save(category);
}

export async function createTestRoom(
  hostId: string,
  overrides: { categoryId?: string; title?: string; description?: string; status?: string; listener_count?: number; scheduledAt?: Date } = {},
): Promise<Room> {
  const repo = AppDataSource.getRepository(Room);
  const room = new Room();
  room.host_id = hostId;
  room.title = overrides.title || `Test Room ${Date.now()}`;
  room.description = overrides.description || '';
  room.categoryId = overrides.categoryId || null;
  room.status = overrides.status || 'live';
  room.listener_count = overrides.listener_count ?? 0;
  room.scheduledAt = overrides.scheduledAt || null;
  room.allow_speakers = true;
  room.chat_enabled = true;
  return await repo.save(room);
}

export function apiRequest(
  method: 'get' | 'post' | 'put' | 'patch' | 'delete',
  path: string,
  body?: Record<string, any>,
  token?: string,
  expectedStatus?: number,
): Test {
  const appRef = getApp();
  let req: Test = request(appRef)[method](path);
  if (token) {
    req = req.set('Authorization', `Bearer ${token}`);
  }
  if (body && method !== 'get') {
    req = req.send(body);
  }
  if (expectedStatus !== undefined) {
    req = req.expect(expectedStatus);
  }
  return req;
}
