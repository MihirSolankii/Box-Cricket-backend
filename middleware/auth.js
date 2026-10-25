import  jwt from "jsonwebtoken";
import dotenv from "dotenv";
dotenv.config();


export const auth = (req, res, next) => {
    try {
        const token =   req.body?.token || req.header("Authorization")?.replace("Bearer ", "");
  
        if (!token) {
            return res.status(401).json({
                success: false,
                message: "token missing"
            })
        }

        // verify the token 
        try {
            const decode = jwt.verify(token, process.env.JWT_SECRET);

            req.user = decode;
            next();
        }
        catch (e) {
            console.error("JWT verification failed:", e.message);
            return res.status(401).json({
                success: false,
                message: "token is invalid",
                error: e.message
            })
        }

    
    }
    catch (err) {
        console.error("Auth middleware error:", err.message);
        return res.status(401).json({
            success: false,
            message: "Something went wrong while verifying token"
        })
    }
}

export const isUser = (req, res, next) => {

    try {
        if (req.user.role !== "user") {
            return res.status(401).json({
                success: false,
                message: "This is a protect route for User you can not access it",
               
            })
        }
        next();
    }
    catch (err) {
        return res.status(500).json({
            success: false,
            message: "User Role is not Matching"
        })
    }
}

export const isAdmin = (req, res, next) => {
    try {
      
       
        if (req.user.role !== "admin") {
            return res.status(401).json({
                success: false,
                message: "This is a protect route for Admins,you can not access it"
            })
        }
        next();
    }
    catch (err) {
        return res.status(500).json({
            success: false,
            message: "User Role is not Matching"
        })
    }
}