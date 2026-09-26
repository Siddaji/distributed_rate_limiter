import redisClient from "../config/redis.js";

export const getStats = async (req, res) => {
    try {
        const totalRequests =
            await redisClient.get("stats:totalRequests");

        const allowedRequests =
            await redisClient.get("stats:allowedRequests");

        const blockedRequests =
            await redisClient.get("stats:blockedRequests");

        res.json({
            totalRequests: Number(totalRequests) || 0,
            allowedRequests: Number(allowedRequests) || 0,
            blockedRequests: Number(blockedRequests) || 0
        });

    } catch (error) {
        console.error("Stats error:", error.message);

        res.status(500).json({
            message: "Unable to fetch statistics"
        });
    }
};

export const getRequestRate = async (req, res) => {
    try {
        const currentSecond = Math.floor(Date.now() / 1000);

        const rates = [];

        for (let i = 9; i >= 0; i--) {
            const second = currentSecond - i;

            const key = `stats:req:${second}`;

            const count = await redisClient.get(key);

            rates.push({
                second,
                requests: Number(count) || 0
            });
        }

        res.json(rates);

    } catch (error) {
        console.error("Request rate error:", error.message);

        res.status(500).json({
            message: "Unable to fetch request rate"
        });
    }
};