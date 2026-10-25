import express from 'express';
// import Admin from '../models/Admin';
import  {updateBoxDetails,updateCourtAvailability,updateOperatingHours,DeleteBox,getTurfsByUser,myturfbooking,analyticsDashboard} from '../Controller/AdminCotroller.js';
import { auth,isAdmin,isUser } from '../middleware/auth.js';
const AdminRouter = express.Router();
import {upload} from '../middleware/multer.js'
import { uploadtoCloudinary } from '../utils/Cloudinary.js';
import Box from '../models/BoxSchema.js';

AdminRouter.put("/update-box-details/:boxId",auth, updateBoxDetails);
AdminRouter.put("/update-court-availability/:boxId",auth, updateCourtAvailability);
AdminRouter.put("/update-operating-hours/:boxId",auth,updateOperatingHours)
AdminRouter.delete("/delete-box/:boxId",auth,DeleteBox);
AdminRouter.get("/turf",auth,getTurfsByUser)
AdminRouter.get("/myturfbooking",auth,isAdmin,myturfbooking)
AdminRouter.get("/analytics",auth,isAdmin,analyticsDashboard)
AdminRouter.put("/add-image/:boxId",auth,isAdmin,upload.single('box-image'), async (req, res) => {
    //get file path 
    const filePath = req.file.path;
    const adminId=req.user.id;
    const boxId=req.params.boxId;
    try {
        const imageUrl = await uploadtoCloudinary(filePath);

        const box = await Box.findOne({ _id: boxId, admin: adminId });
        if (!box) {
            return res.status(404).json({ success: false, message: 'Box not found or access denied' });
        }
        
        box.images.push(imageUrl.url);
        const updatedbox=await box.save();

        return res.status(200).json({ success: true, message: 'Images added successfully', images: imageUrl,box:updatedbox });
    } catch (error) {
        console.error('addimagetoBox error:', error);
        return res.status(500).json({ success: false, message: 'Server error', error: error.message });
    }   
});



export default AdminRouter;
