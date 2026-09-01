import express from "express";
import dotenv from "dotenv";
import "./config/redis.js";
import { ratelimiter } from "./middleware/rateLimiter.js";

// import cors from "cors";

dotenv.config();

const app = express();
app.use(express.json());

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