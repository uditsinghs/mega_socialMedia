import { v2 as cloudinary } from "cloudinary";
import fs from "fs";
import dotenv from "dotenv";
dotenv.config();


cloudinary.config({
  cloud_name: process.env.CLOUDINARY_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET, 
});

// Upload an image
const uploadOnCloudinary = async (localFilePath) => {
  try {
    if (!localFilePath) return null;
    const uploadResult = await cloudinary.uploader.upload(localFilePath, {
      resource_type: "auto",
    });
    fs.unlinkSync(localFilePath);
    // console.log("data comes from cloudinary:" , uploadResult);
    return uploadResult;
  
  } catch (error) {
    fs.unlinkSync(localFilePath); // remove the locally saved temporary files as the upload operation failed
    console.error("Error uploading file to Cloudinary:", error);
    return null;
  }
};

export default uploadOnCloudinary;
