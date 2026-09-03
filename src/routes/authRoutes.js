import express from "express";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";

const router = express.Router();

const users = [];

router.post("/register", async (req, res) => {
    const { username, password } = req.body;

    if(!username || !password){
        return res.status(400).json({
            message : "Username and password are required"
        });
    }

    const existingUser = users.find(user => user.username === username);

    if(existingUser){
        return res.status(409).json({
            message : "User already exists"
        });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = {
        id : users.length + 1,
        username,
        password : hashedPassword
    }

    users.push(user);

     res.status(201).json({
        message: "User registered successfully"
    });
});


// LOGIN
router.post("/login", async (req, res) => {
    const { username, password } = req.body;

    const user = users.find(
        user => user.username === username
    );

    if (!user) {
        return res.status(401).json({
            message: "Invalid username or password"
        });
    }

    const passwordMatch = await bcrypt.compare(
        password,
        user.password
    );

    if (!passwordMatch) {
        return res.status(401).json({
            message: "Invalid username or password"
        });
    }

    const token = jwt.sign(
        {
            id: user.id,
            username: user.username
        },
        process.env.JWT_SECRET,
        {
            expiresIn: "10s"
        }
    );

    res.json({
        message: "Login successful",
        token
    });
});

export default router;

