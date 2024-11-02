import {v2 as cloudinary} from 'cloudinary';
import fs from 'fs';
import configs from '../config/index.js';

cloudinary.config({
    cloud_name: configs.cloudindary.cloud_name,
    api_key: configs.cloudindary.api_key,
    api_secret: configs.cloudindary.api_secret
});

const uploadOnCloudinary = async (localFilePath) =>{
    try {
        if(!localFilePath) return new Error('Please provide a valid file path');

        console.log("Uploading file on cloudinary - ", localFilePath);
        const response = await cloudinary.uploader.upload(localFilePath,{
            resource_type: "auto"
        });
        console.log("File uploaded successfully on cloudinary - ", response);
        return response;
    }
    catch (error) {
        fs.unlinkSync(localFilePath);
        throw new Error(error);
        console.log(error);
    }
}

const getFileFromCloudinary = (publicId) => {
    return new Promise((resolve, reject) => {
      cloudinary.api.resource(publicId, (error, result) => {
        if (error) {
          reject(error);
        } else {
          resolve(result);
        }
      });
    });
  };

  const getAllFilesFromCloudinary = () => {
    return new Promise((resolve, reject) => {
      cloudinary.api.resources((error, result) => {
        if (error) {
          reject(error);
        } else {
          resolve(result.resources);
        }
      });
    });
  };


  const deleteFileFromCloudinary = (publicId) => {
    return new Promise((resolve, reject) => {
      cloudinary.uploader.destroy(publicId, (error, result) => {
        if (error) {
          reject(error);
        } else {
          resolve(result);
        }
      });
    });
  };


export {uploadOnCloudinary,deleteFileFromCloudinary,getAllFilesFromCloudinary,getFileFromCloudinary}