import express from "express";
import { getStats } from "../controllers/statsController.js";
import { getRequestRate } from "../controllers/statsController.js";

const router = express.Router();

router.get("/stats", getStats);

router.get("/request-rate", getRequestRate);

export default router;