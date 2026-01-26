import express from "express";
const router = express.Router();
import {resetPassword, signup} from "../Controller/AuthController.js";
import { login } from "../Controller/AuthController.js";
import {verifyEmail} from "../Controller/AuthController.js"
import {resendVerification} from "../Controller/AuthController.js"
import {forgetPassword} from "../Controller/AuthController.js"
import BaseUser from '../models/BaseUser.js';
import User from "../models/User.js";
import { auth,isAdmin,isUser } from '../middleware/auth.js';
import UserProfile from  '../Controller/UserProfile.js'
// import AdminProfile from  '../Controller/AdminProfile.js'
import { searchBoxes ,AdminProfile} from "../Controller/AdminProfile.js";
import Admin from "../models/Admin.js";

router.post("/signup", signup);
router.post("/login", login);
router.get("/verify",verifyEmail);
router.post("/resend-verification",resendVerification);
router.post("/forget-password",forgetPassword);
router.post("/reset-password",resetPassword);
router.get('/profile', auth, async (req, res) => { // 1. Use auth middleware and make function async
    
    // 2. For a profile, typically use ID/email from the authenticated user token (req.user)
    const { id } = req.user; 
    console.log("2. ID being searched in DB:", id);
    
    try {
        // 3. Await the execution of the Mongoose query
        const userone = await BaseUser.findById(id).select('-password'); // Find by ID is standard for auth, and exclude the password

        if (!userone) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        } 
        const friendsname = [];
        console.log("hello backend data ::::::::", userone);
        await Promise.all(
            userone.friends.map(async (friend) => {
                console.log("friedns are",friend);
                
                const user = await User.findById(friend.toString()).select('name');
                console.log("your friends are ::", user);
                const username = user.name;
                console.log(username);
                friendsname.push(username);
            })
        );
        console.log(friendsname);
        
      
        return res.status(200).json({
            success: true,
            message: 'User profile fetched successfully',
            user: userone ,
            friendsname
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({
            success: false,
            message: 'An error occurred while fetching the profile'
        });
    }
}); 
router.get('/admin/profile', auth, async (req, res) => { // 1. Use auth middleware and make function async
    
    // 2. For a profile, typically use ID/email from the authenticated user token (req.user)
    const { id } = req.user; 
    console.log("2. ID being searched in DB:", id);
    try {
       const admin=await Admin.findById(id).select('-password');
       if(!admin){
        return res.status(404).json({
            success: false,
            message: 'Admin not found'
        });
       }
         return res.status(200).json({
            success: true,
            message: 'Admin profile fetched successfully',
            admin: admin 
        }); 

    } catch (error) {
        console.error(error);
        res.status(500).json({
            success: false,
            message: 'An error occurred while fetching the profile'
        }); 
    }


})
router.post("/user", auth, isUser, UserProfile)
router.post("/admin",auth,isAdmin,AdminProfile);
router.get("/boxes/search", auth, searchBoxes);

export default router;