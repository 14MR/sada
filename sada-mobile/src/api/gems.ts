import client from './client';
import * as SecureStore from 'expo-secure-store';
import { createGemService } from './gemsCore';

export const GemService = createGemService(client, SecureStore);
