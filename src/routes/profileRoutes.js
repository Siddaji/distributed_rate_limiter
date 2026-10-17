import express from "express";
import { protect } from "../middleware/authMiddleware.js";
import { ratelimiter } from "../middleware/rateLimiter.js";
import { tokenBucket } from "../middleware/tokenBucket.js";
import redisClient from "../config/redis.js";

const router = express.Router();

router.get("/profile", protect, ratelimiter,(req, res) => {

    res.json({
        message: "You are authorized",
        user: req.user
    });

});


router.get("/token-profile", protect, tokenBucket, (req, res) => {
    res.json({
        message: "Token bucket working",
        user: req.user
    });
});

router.get("/rate-limit-status", protect, async (req, res) => {
    try {
        const limit = req.user.role === "premium" ? 20 : 5;
        const key = `rate-limit:user:${req.user.id}`;

        const count = await redisClient.get(key);
        const ttl = await redisClient.ttl(key);

        const used = Number(count) || 0;
        const remaining = Math.max(0, limit - used);
        const utilizationPercentage = Math.min(
            100,
            Math.round((used / limit) * 100)
        );

        res.json({
            limit,
            used,
            remaining,
            utilizationPercentage,
            resetInSeconds: ttl > 0 ? ttl : 0
        });
    } catch (error) {
        console.error("Rate-limit status error:", error.message);

        res.status(500).json({
            message: "Unable to fetch rate-limit status"
        });
    }
});
export default router;