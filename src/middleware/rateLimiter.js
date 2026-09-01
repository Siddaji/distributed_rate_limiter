import redisclient from "../config/redis.js";

const WINDOW_SIZE = 60 * 1000;
const MAX_REQUESTS = 5;

export const ratelimiter = async (req, res, next) => {
    const ip = req.ip;
    const currentTime = Date.now();

    const key = `rate-limit:${ip}`;
    const windowkey = `rate-limit-window:${ip}`;

    const currentCount = await redisclient.get(key);
    const windowStart = await redisclient.get(windowkey);

    res.setHeader("X-RateLimit-Limit", MAX_REQUESTS);

    // First request
    if (currentCount === null) {
        await redisclient.set(key, 1);
        await redisclient.set(windowkey, currentTime);

        res.setHeader(
            "X-RateLimit-Remaining",
            MAX_REQUESTS - 1
        );

        res.setHeader(
            "X-RateLimit-Reset",
            Math.ceil(WINDOW_SIZE / 1000)
        );

        return next();
    }

    const timePassed = currentTime - Number(windowStart);

    const resetTime = Math.ceil(
        (WINDOW_SIZE - timePassed) / 1000
    );

    // Window expired
    if (timePassed >= WINDOW_SIZE) {
        await redisclient.set(key, 1);
        await redisclient.set(windowkey, currentTime);

        res.setHeader(
            "X-RateLimit-Remaining",
            MAX_REQUESTS - 1
        );

        res.setHeader(
            "X-RateLimit-Reset",
            Math.ceil(WINDOW_SIZE / 1000)
        );

        return next();
    }

    const count = Number(currentCount);

    // Limit exceeded
    if (count >= MAX_REQUESTS) {
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

    // Allow request
    const newCount = count + 1;

    await redisclient.set(key, newCount);

    res.setHeader(
        "X-RateLimit-Remaining",
        MAX_REQUESTS - newCount
    );

    res.setHeader(
        "X-RateLimit-Reset",
        resetTime
    );

    next();
};