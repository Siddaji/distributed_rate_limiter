import express from "express";
import { protect } from "../middleware/authMiddleware.js";
import { ratelimiter } from "../middleware/rateLimiter.js";
import { tokenBucket } from "../middleware/tokenBucket.js";

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

export default router;