import redisClient from '../config/redis.js';

const CAPACITY = 5;
const REFILL_RATE = 1; 

export const tokenBucket = async(req, res, next) =>{
    const key = `token-bucket:user:${req.user.id}`;

    const tokens = await redisClient.get(key);

    if(tokens === null){
        await redisClient.set(key, CAPACITY);
    }

    let currentTokens = tokens === null ? CAPACITY : Number(tokens);

    const lastRefillTime = await redisClient.get(`${key}:time`);
    const now = Date.now();
    let elapsedTime = 0;

    if(lastRefillTime !== null){
        elapsedTime = (now - Number(lastRefillTime)) / 1000;
    }

    const refillTokens = Math.floor(elapsedTime * REFILL_RATE);
    currentTokens = Math.min(currentTokens + refillTokens, CAPACITY);

    await redisClient.set(`${key}:time`, now);

    if(currentTokens <= 0){
        return res.status(429).json({message: 'Too many requests. Please try again later.'});
    }

    currentTokens -= 1;
    await redisClient.set(key, currentTokens);

    next();
}