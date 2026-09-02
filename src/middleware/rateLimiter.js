import redisclient from "../config/redis.js";

const WINDOW_SIZE = 60;
const MAX_REQUESTS = 5;

export const ratelimiter = async (req, res, next) => {
    const ip = req.ip;

    const key = `rate-limit:${ip}`;

    // Atomically increment request count
    const count = await redisclient.incr(key);

    // First request of this window
    if (count === 1) {
        await redisclient.expire(key, WINDOW_SIZE);
    }

    // Get remaining time
    const resetTime = await redisclient.ttl(key);

    res.setHeader(
        "X-RateLimit-Limit",
        MAX_REQUESTS
    );

    // Limit exceeded
    if (count > MAX_REQUESTS) {
        res.setHeader(
            "X-RateLimit-Remaining",
            0
        );

        res.setHeader(
            "X-RateLimit-Reset",
            resetTime
        );

        return res.status(429).json({
            message: "Too many requests. Please try again later"
        });
    }

    // Request allowed
    res.setHeader(
        "X-RateLimit-Remaining",
        MAX_REQUESTS - count
    );

    res.setHeader(
        "X-RateLimit-Reset",
        resetTime
    );

    next();
};