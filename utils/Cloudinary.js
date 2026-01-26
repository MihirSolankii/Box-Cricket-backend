
import {v2 as cloudinary} from 'cloudinary';
import fs from 'fs';
import dotenv from "dotenv";
 
dotenv.config();
console.log(process.env.CLOUDINARY_CLOUD_NAME);

cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
});
 

 
export const uploadtoCloudinary=async(localPath)=>{
    try {
        const result = await cloudinary.uploader.upload(localPath,{
            folder: "boxcricket_images",
            resource_type: "image",
        });
        fs.unlinkSync(localPath);
        console.log("file upload to cloudinary",result.url);
        
        return result;
    } catch (error) {
        console.error("Error uploading to Cloudinary:", error);
        throw error;
    }
}