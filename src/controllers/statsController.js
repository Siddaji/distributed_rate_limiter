import  redisClient from "../config/redis.js";

export const getStats = async (req, res) =>{
    const totalRequests = await redisClient.get("stats:totalRequests");
    const allowedRequests = await redisClient.get("stats:allowedRequests");
    const blockedRequests = await redisClient.get("stats:blockedRequests");

    res.json({
        totalRequests: Number(totalRequests) || 0,
        allowedRequests: Number(allowedRequests) || 0,
        blockedRequests: Number(blockedRequests) || 0
    });
};

