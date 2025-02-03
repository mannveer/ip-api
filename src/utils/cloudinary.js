import { v2 as cloudinary } from 'cloudinary';
import fs from 'fs/promises'; // Use promises for fs operations
import configs from '../config/index.js';
import axios from 'axios';

class CloudinaryService {
  constructor() {
    cloudinary.config({
      cloud_name: configs.cloudindary.cloud_name,
      api_key: configs.cloudindary.api_key,
      api_secret: configs.cloudindary.api_secret,
    });
  }

  async uploadFileBuffer (fileBuffer, folder, fileName) {
    return new Promise((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream(
        {
          folder: folder,
          public_id: fileName,
          resource_type: 'auto',
        },
        (error, result) => {
          if (error) {
            return reject(error);
          }
          resolve(result);
        }
      );
  
      // Write the file buffer to the upload stream
      uploadStream.end(fileBuffer);
    });
  };
  
  async createSubFolder(parentFolder, subFolder) {
    try {
      console.log('Creating subfolder:', parentFolder+subFolder);
      const folderPath = `${parentFolder}/${subFolder}`;
      const response = await cloudinary.api.create_folder(folderPath);
      console.log('Subfolder created successfully:', response);
      return response;
    } catch (error) {
      console.error('Error creating subfolder:', error.message);
      throw error;
    }
  }

  async upload(localFilePath, uploadToFolder) {
    if (!localFilePath) throw new Error('Please provide a valid file path');
    if (!uploadToFolder) throw new Error('Please provide a valid folder name');
  
    try {
      console.log("Uploading file to Cloudinary:", localFilePath);
  
      const response = await cloudinary.uploader.upload(localFilePath, {
        resource_type: 'auto', // Automatically detect the file type (image, video, etc.)
        folder: uploadToFolder, // Specify the folder where the file should be uploaded
      });
  
      console.log("File uploaded successfully:", response);
      return response;
    } catch (error) {
      console.error("Error during upload:", error);
      // Attempt to delete the local file if an error occurs
      await fs.unlink(localFilePath).catch((err) =>
        console.error("Error deleting file:", err)
      );
      throw error;
    }
  }
  

  async getFile(publicId) {
    try {
      const result = await cloudinary.api.resource(publicId);
      return result;
    } catch (error) {
      console.error("Error fetching file from Cloudinary:", error);
      throw error;
    }
  }


  async fetchFileStream (fileUrl){
    try {
      const response = await axios({
        url: fileUrl,
        method: 'GET',
        responseType: 'stream', 
      });
  
      return response.data;
    } catch (error) {
      console.error('Error fetching file from Cloudinary:', error);
      throw error; // Re-throw the error to handle it where the function is called
    }
  };
  

  async getAllFiles() {
    try {
      const result = await cloudinary.api.resources();
      return result.resources;
    } catch (error) {
      console.error("Error fetching files from Cloudinary:", error);
      throw error;
    }
  }

  async deleteFile(publicId) {
    try {
      const result = await cloudinary.uploader.destroy(publicId);
      return result;
    } catch (error) {
      console.error("Error deleting file from Cloudinary:", error);
      throw error;
    }
  }

  async getAllFilesInFolder(folderPath) {
    try {
      let resources = [];
      let nextCursor = null;
  
      do {
        const response = await cloudinary.api.resources({
          type: 'upload',           // Fetch only uploaded files
          prefix: folderPath,       // Folder path (includes subfolders)
          max_results: 500,         // Maximum files per request (limit is 500)
          next_cursor: nextCursor,  // Cursor for pagination
        });
  
        resources = resources.concat(response.resources); // Add fetched files
        nextCursor = response.next_cursor;               // Update cursor
      } while (nextCursor); // Loop until all files are fetched
  
      return resources;
    } catch (error) {
      console.error('Error fetching files:', error);
      throw error;
    }
  }
  

  async getFileFromFolder(folder) {
    try {
      const result = await cloudinary.api.resources({
        type: 'upload',
        prefix: folder,
      });
      return result.resources;
    } catch (error) {
      console.error("Error fetching files from Cloudinary:", error);
      throw error;
    }
  }
}
export const cloudinaryServiceInstance = new CloudinaryService();
// export default CloudinaryService;
