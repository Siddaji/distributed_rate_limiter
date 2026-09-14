import redisclient from "../config/redis.js";

const WINDOW_SIZE = 60;

export const ratelimiter = async (req, res, next) => {
  const key = `rate-limit:user:${req.user.id}`;
  const MAX_REQUESTS = req.user.role === "premium" ? 20 : 5;

  const count = await redisclient.incr(key);
  await redisclient.incr("stats:totalRequests");
  

  if (count === 1) {
    await redisclient.expire(key, WINDOW_SIZE);
  }

  const resetTime = await redisclient.ttl(key);

  res.setHeader("X-RateLimit-Limit", MAX_REQUESTS);

  if (count > MAX_REQUESTS) {
    await redisclient.incr("stats:blockedRequests");
    
    res.setHeader("X-RateLimit-Remaining", 0);

    res.setHeader("X-RateLimit-Reset", resetTime);

    return res.status(429).json({
      message: "Too many requests. Please try again later",
    });
  }

  res.setHeader("X-RateLimit-Remaining", MAX_REQUESTS - count);

  res.setHeader("X-RateLimit-Reset", resetTime);

  await redisclient.incr("stats:allowedRequests");

  next();
};
