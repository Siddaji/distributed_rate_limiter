import express from "express";
import redisClient from "../config/redis.js";

const router = express.Router();

router.get("/health", (req, res) => {
    const redisStatus = redisClient.isReady
        ? "connected"
        : "disconnected";

    res.json({
        status: "healthy",
        redis: redisStatus,
        uptime: Math.floor(process.uptime())
    });
});

export default router;