import jwt from "jsonwebtoken";

export const protect = (req, res, next) =>{
    try{
        const authHeader = req.headers.authorization;

        if(!authHeader){
            return res.status(401).json({
                message : "User is not authorized"
            });
        }

        const token = authHeader.split(" ")[1];

        if(!token){
            return res.status(401).json({
                message : "Token is not provided"
            });
        }

        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        req.user = decoded;

        next();
    }
    catch(error){
        return res.status(401).json({
            message : "Invalid or expired token"
        });
    }

}