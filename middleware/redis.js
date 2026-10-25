import { Redis } from 'ioredis';
import dotenv from 'dotenv';
dotenv.config(); // Ensures .env variables are loaded locally

// 1. Try to use the environment variable (for Render)
const client = new Redis(process.env.REDIS_URL || 'redis://127.0.0.1:6379');

let hasLoggedRedisError = false;

client.on('connect', () => {
    hasLoggedRedisError = false;
    console.log('Redis Connected Successfully');
});

client.on('error', (err) => {
    if (!hasLoggedRedisError) {
        console.warn('⚠️ Redis Connection Warning:', err.message);
        hasLoggedRedisError = true;
    }
});

export default client;