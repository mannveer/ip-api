import { FileStreamResponse, IStorageProvider } from '../../interfaces/file.interface';
import configs from '../../config';
import logger from '../../utils/logger';
import { AppError } from '../../utils/AppError';
import { v2 as cloudinary } from 'cloudinary';
import fs from 'fs/promises';
import axios from 'axios';
import { v4 as uuidv4 } from 'uuid';

// Singleton CloudinaryService with optimized implementation
export class CloudinaryService {
  private static instance: CloudinaryService | null = null;
  private folderCache: Map<string, { path: string, timestamp: number }> = new Map();
  private static readonly CACHE_TTL = 5 * 60 * 1000; // 5 minutes cache
  
  private constructor() {
    cloudinary.config({
      cloud_name: configs.cloudindary.cloud_name,
      api_key: configs.cloudindary.api_key,
      api_secret: configs.cloudindary.api_secret,
    });
    logger.info('Cloudinary service initialized successfully');
  }

  public static getInstance(): CloudinaryService {
    if (!CloudinaryService.instance) {
      CloudinaryService.instance = new CloudinaryService();
    }
    return CloudinaryService.instance;
  }

  async uploadFileBuffer(fileBuffer: Buffer, folder: string, fileName: string): Promise<any> {
    return new Promise((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream(
        {
          folder: folder,
          public_id: fileName,
          resource_type: 'auto',
        },
        (error, result) => {
          if (error) {
            logger.error(`Error uploading file buffer to Cloudinary: ${error.message}`);
            return reject(error);
          }
          logger.info(`File buffer uploaded to Cloudinary: ${result?.public_id || 'unknown'}`);
          resolve(result);
        }
      );
  
      // Write the file buffer to the upload stream
      uploadStream.end(fileBuffer);
    });
  }
  
  async createSubFolder(parentFolder: string, subFolder: string): Promise<any> {
    // Check cache first
    const cacheKey = `${parentFolder}/${subFolder}`;
    const cachedFolder = this.folderCache.get(cacheKey);
    
    if (cachedFolder && (Date.now() - cachedFolder.timestamp) < CloudinaryService.CACHE_TTL) {
      logger.debug(`Using cached folder: ${cacheKey}`);
      return { path: cachedFolder.path };
    }
    
    try {
      logger.info(`Creating subfolder: ${cacheKey}`);
      const folderPath = `${parentFolder}/${subFolder}`;
      const response = await cloudinary.api.create_folder(folderPath);
      
      // Update cache
      this.folderCache.set(cacheKey, { 
        path: response.path, 
        timestamp: Date.now() 
      });
      
      logger.info(`Subfolder created successfully: ${response.path}`);
      return response;
    } catch (error: any) {
      // Handle case where folder might already exist
      if (error.error && error.error.message && error.error.message.includes('already exists')) {
        logger.info(`Folder already exists: ${cacheKey}`);
        const folderPath = `${parentFolder}/${subFolder}`;
        
        // Update cache
        this.folderCache.set(cacheKey, { 
          path: folderPath, 
          timestamp: Date.now() 
        });
        
        return { path: folderPath };
      }
      
      logger.error(`Error creating subfolder: ${error.message}`);
      throw error;
    }
  }

  async upload(localFilePath: string, uploadToFolder: string): Promise<any> {
    if (!localFilePath) throw new Error('Please provide a valid file path');
    if (!uploadToFolder) throw new Error('Please provide a valid folder name');
  
    try {
      logger.info(`Uploading file to Cloudinary: ${localFilePath}`);
  
      const response = await cloudinary.uploader.upload(localFilePath, {
        resource_type: 'auto',
        folder: uploadToFolder,
      });
  
      logger.info(`File uploaded successfully: ${response.public_id}`);
      return response;
    } catch (error: any) {
      logger.error(`Error during upload: ${error.message}`);
      // Clean up local file if an error occurs
      await fs.unlink(localFilePath).catch((err) =>
        logger.error(`Error deleting file: ${err.message}`)
      );
      throw error;
    }
  }

  async getFile(publicId: string): Promise<any> {
    try {
      const result = await cloudinary.api.resource(publicId);
      return result;
    } catch (error: any) {
      logger.error(`Error fetching file from Cloudinary: ${error.message}`);
      throw error;
    }
  }

  async fetchFileStream(fileUrl: string): Promise<any> {
    try {
      const response = await axios({
        url: fileUrl,
        method: 'GET',
        responseType: 'stream', 
      });
  
      return response.data;
    } catch (error: any) {
      logger.error(`Error fetching file stream from Cloudinary: ${error.message}`);
      throw error;
    }
  }

  async getAllFiles(): Promise<any[]> {
    try {
      const result = await cloudinary.api.resources({
        max_results: 500 // Increase to reduce number of API calls
      });
      return result.resources;
    } catch (error: any) {
      logger.error(`Error fetching all files from Cloudinary: ${error.message}`);
      throw error;
    }
  }

  async deleteFile(publicId: string): Promise<any> {
    try {
      const result = await cloudinary.uploader.destroy(publicId);
      logger.info(`File deleted from Cloudinary: ${publicId}`);
      return result;
    } catch (error: any) {
      logger.error(`Error deleting file from Cloudinary: ${error.message}`);
      throw error;
    }
  }

  async getAllFilesInFolder(folderPath: string): Promise<any[]> {
    try {
      let resources: any[] = [];
      let nextCursor: string | null = null;
  
      // Use do-while to process pagination
      do {
        const response = await cloudinary.api.resources({
          type: 'upload',
          prefix: folderPath,
          max_results: 500, // Maximize results per request
          next_cursor: nextCursor,
        });
  
        resources = resources.concat(response.resources);
        nextCursor = response.next_cursor;
      } while (nextCursor);
  
      return resources;
    } catch (error: any) {
      logger.error(`Error fetching files from folder ${folderPath}: ${error.message}`);
      throw error;
    }
  }

  async getFileFromFolder(folder: string): Promise<any[]> {
    try {
      const result = await cloudinary.api.resources({
        type: 'upload',
        prefix: folder,
        max_results: 500 // Increase to reduce number of API calls
      });
      return result.resources;
    } catch (error: any) {
      logger.error(`Error fetching files from folder ${folder}: ${error.message}`);
      throw error;
    }
  }
}

// Use a function to get the singleton instance
export const getCloudinaryService = (): CloudinaryService => {
  return CloudinaryService.getInstance();
};

// Storage Provider implementation
export class CloudinaryStorageProvider implements IStorageProvider {
  private service: CloudinaryService;
  
  constructor() {
    this.service = getCloudinaryService();
  }

  async uploadFile(file: Express.Multer.File, fileName?: string): Promise<string> {
    try {
      const uniqueName = fileName || `${Date.now()}-${Math.round(Math.random() * 1E9)}-${file.originalname}`;
      const fileId = uuidv4(); // Generate unique ID
      
      const response = await this.service.uploadFileBuffer(
        file.buffer,
        configs.cloudindarydrive.filesFolderName,
        uniqueName
      );
      
      logger.info(`File uploaded to Cloudinary: ${response.public_id} (${fileId})`);
      
      // Store fileId as a property if needed for future retrieval
      return response.asset_id;
    } catch (error: any) {
      logger.error(`Error uploading file to Cloudinary: ${error.message}`);
      throw new AppError('Failed to upload file to Cloudinary', 500);
    }
  }

  async uploadFiles(files: Express.Multer.File[]): Promise<{ newfilename: string, fileId: string }[]> {
    // Use Promise.all for concurrent uploads
    const uploadPromises = files.map(async (file) => {
      const uniqueName = `${Date.now()}-${Math.round(Math.random() * 1E9)}-${file.originalname}`;
      
      const response = await this.service.uploadFileBuffer(
        file.buffer,
        configs.cloudindarydrive.filesFolderName,
        uniqueName
      );
      
      return {
        newfilename: uniqueName,
        fileId: response.asset_id
      };
    });

    try {
      return await Promise.all(uploadPromises);
    } catch (error: any) {
      logger.error(`Error uploading multiple files: ${error.message}`);
      throw new AppError('Failed to upload files to Cloudinary', 500);
    }
  }

  async getFileStream(fileId: string): Promise<FileStreamResponse> {
    try {
      const file = await this.service.fetchFileStream(fileId);
      return {
        data: file,
        name: fileId
      };
    } catch (error: any) {
      logger.error(`Error getting file stream from Cloudinary: ${error.message}`);
      throw new AppError('Failed to get file from Cloudinary', 500);
    }
  }

  async deleteFile(fileId: string): Promise<void> {
    try {
      await this.service.deleteFile(fileId);
      logger.info(`File deleted from Cloudinary: ${fileId}`);
    } catch (error: any) {
      logger.error(`Error deleting file from Cloudinary: ${error.message}`);
      throw new AppError('Failed to delete file from Cloudinary', 500);
    }
  }

  async createSampleFolder(fileName: string): Promise<string> {
    try {
      const folderRes = await this.service.createSubFolder(
        configs.cloudindarydrive.sampleFolderName,
        fileName
      );
      return folderRes.path;
    } catch (error: any) {
      logger.error(`Error creating sample folder: ${error.message}`);
      throw new AppError('Failed to create sample folder', 500);
    }
  }

  async createPreviewFolder(fileName: string): Promise<string> {
    try {
      const folderRes = await this.service.createSubFolder(
        configs.cloudindarydrive.previewFolderName,
        fileName
      );
      return folderRes.path;
    } catch (error: any) {
      logger.error(`Error creating preview folder: ${error.message}`);
      throw new AppError('Failed to create preview folder', 500);
    }
  }

  async getFilesFromFolder(folderPath: string): Promise<any[]> {
    try {
      const files = await this.service.getFileFromFolder(folderPath);
      return files.map(file => ({
        id: file.asset_id,
        name: file.public_id,
        secure_url: file.secure_url
      }));
    } catch (error: any) {
      logger.error(`Error getting files from Cloudinary folder: ${error.message}`);
      return [];
    }
  }

  async deleteAllFiles(fileIds: string[]): Promise<void> {
    try {
      // Use Promise.all for concurrent deletions
      const deletePromises = fileIds.map(fileId => this.deleteFile(fileId));
      await Promise.all(deletePromises);
      logger.info(`Batch deleted ${fileIds.length} files from Cloudinary`);
    } catch (error: any) {
      logger.error(`Error during batch file deletion: ${error.message}`);
      throw new AppError('Failed to delete files from Cloudinary', 500);
    }
  }
}