import express from "express";
import dotenv from "dotenv";
import cors from "cors";
import "./config/redis.js";
import { ratelimiter } from "./middleware/rateLimiter.js";
import authRoutes from "./routes/authRoutes.js";
import profileRoutes from "./routes/profileRoutes.js";
import statsRoutes from "./routes/statsRoutes.js";

// import cors from "cors";

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());


app.use("/auth", authRoutes);
app.use(profileRoutes);
app.use(statsRoutes);

app.use(ratelimiter);


app.get("/", (req, res) =>{
    res.json({
         message: "Rate Limiter API is running"
    });
});

const PORT = process.env.PORT || 5000;

app.listen(PORT, () =>{
    console.log(`Server is running on:${PORT}`);
})