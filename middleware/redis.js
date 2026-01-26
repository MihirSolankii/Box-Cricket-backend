import { Redis } from 'ioredis';
import dotenv from 'dotenv';
dotenv.config(); // Ensures .env variables are loaded locally

// 1. Try to use the environment variable (for Render)
// 2. If that doesn't exist, fall back to localhost (for your local Docker)
const client = new Redis(process.env.REDIS_URL || 'redis://localhost:6379' );

client.on('connect', () => {
    console.log('Redis Connected Successfully');
});

client.on('error', (err) => {
    console.error('Redis Connection Error:', err);
});

export default client;