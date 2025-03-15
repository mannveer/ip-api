// services/storage/cloudinary-storage.service.ts
import { v2 as cloudinary } from 'cloudinary';
import { v4 as uuidv4 } from 'uuid';
import axios from 'axios';
import { Readable } from 'stream';
import configs from '../../config';
import logger from '../../utils/logger';
import { AppError } from '../../utils/AppError';
import { FileMetadata, FileStreamResponse, IFileStorageProvider } from '../../interfaces/file.interface';

export class CloudinaryStorageProvider implements IFileStorageProvider {
  private static instance: CloudinaryStorageProvider | null = null;
  private folderCache: Map<string, { path: string, timestamp: number }> = new Map();
  private static readonly CACHE_TTL = 5 * 60 * 1000; // 5 minutes cache
  
  private constructor() {
    cloudinary.config({
      cloud_name: configs.cloudinary.cloud_name,
      api_key: configs.cloudinary.api_key,
      api_secret: configs.cloudinary.api_secret,
    });
    logger.info('Cloudinary service initialized successfully');
  }

  public static getInstance(): CloudinaryStorageProvider {
    if (!CloudinaryStorageProvider.instance) {
      CloudinaryStorageProvider.instance = new CloudinaryStorageProvider();
    }
    return CloudinaryStorageProvider.instance;
  }

  // Core file operations
  async getFile(fileId: string): Promise<FileMetadata> {
    try {
      const result = await cloudinary.api.resource(fileId);
      return this.mapToFileMetadata(result);
    } catch (error: any) {
      logger.error(`Error fetching file from Cloudinary: ${error.message}`);
      throw new AppError('Failed to get file from Cloudinary', error.http_code || 500);
    }
  }

  async getFiles(fileIds: string[]): Promise<FileMetadata[]> {
    try {
      // Use Promise.all for concurrent requests
      const metadataPromises = fileIds.map(id => this.getFile(id).catch(err => {
        logger.warn(`Error fetching file ${id}: ${err.message}`);
        return null;
      }));
      
      const results = await Promise.all(metadataPromises);
      return results.filter((metadata): metadata is FileMetadata => metadata !== null);
    } catch (error: any) {
      logger.error(`Error fetching multiple files: ${error.message}`);
      throw new AppError('Failed to get files from Cloudinary', 500);
    }
  }

  async uploadFile(file: Express.Multer.File, fileName?: string): Promise<string> {
    try {
      const uniqueName = fileName || `${Date.now()}-${Math.round(Math.random() * 1E9)}-${file.originalname}`;
      
      const response = await this.uploadFileBuffer(
        file.buffer,
        configs.cloudinary.filesFolderName,
        uniqueName
      );
      
      logger.info(`File uploaded to Cloudinary: ${response.public_id}`);
      return response.public_id;
    } catch (error: any) {
      logger.error(`Error uploading file to Cloudinary: ${error.message}`);
      throw new AppError('Failed to upload file to Cloudinary', 500);
    }
  }

  async uploadFiles(files: Express.Multer.File[]): Promise<string[]> {
    try {
      // Use Promise.all for concurrent uploads
      const uploadPromises = files.map(file => this.uploadFile(file));
      return await Promise.all(uploadPromises);
    } catch (error: any) {
      logger.error(`Error uploading multiple files: ${error.message}`);
      throw new AppError('Failed to upload files to Cloudinary', 500);
    }
  }

  async deleteFile(fileId: string): Promise<boolean> {
    try {
      const result = await cloudinary.uploader.destroy(fileId);
      const success = result.result === 'ok';
      if (success) {
        logger.info(`File deleted from Cloudinary: ${fileId}`);
      } else {
        logger.warn(`Failed to delete file from Cloudinary: ${fileId}`);
      }
      return success;
    } catch (error: any) {
      logger.error(`Error deleting file from Cloudinary: ${error.message}`);
      return false;
    }
  }

  async deleteFiles(fileIds: string[]): Promise<boolean[]> {
    // Use Promise.all for concurrent deletions
    const deletePromises = fileIds.map(id => this.deleteFile(id));
    return await Promise.all(deletePromises);
  }

  // Folder operations
  async createFolder(folderName: string, parentFolderId?: string): Promise<string> {
    // Check cache first
    const folderPath = parentFolderId ? `${parentFolderId}/${folderName}` : folderName;
    const cachedFolder = this.folderCache.get(folderPath);
    
    if (cachedFolder && (Date.now() - cachedFolder.timestamp) < CloudinaryStorageProvider.CACHE_TTL) {
      logger.debug(`Using cached folder: ${folderPath}`);
      return cachedFolder.path;
    }
    
    try {
      logger.info(`Creating folder: ${folderPath}`);
      const response = await cloudinary.api.create_folder(folderPath);
      
      // Update cache
      this.folderCache.set(folderPath, { 
        path: response.path, 
        timestamp: Date.now() 
      });
      
      logger.info(`Folder created successfully: ${response.path}`);
      return response.path;
    } catch (error: any) {
      // Handle case where folder might already exist
      if (error.error && error.error.message && error.error.message.includes('already exists')) {
        logger.info(`Folder already exists: ${folderPath}`);
        
        // Update cache
        this.folderCache.set(folderPath, { 
          path: folderPath, 
          timestamp: Date.now() 
        });
        
        return folderPath;
      }
      
      logger.error(`Error creating folder: ${error.message}`);
      throw new AppError('Failed to create folder in Cloudinary', 500);
    }
  }

  async getFilesFromFolder(folderId: string): Promise<FileMetadata[]> {
    try {
      const resources = await cloudinary.api.resources({
        type: 'upload',
        prefix: folderId,
        max_results: 500
      });
      
      return resources.resources.map(resource => this.mapToFileMetadata(resource));
    } catch (error: any) {
      logger.error(`Error fetching files from folder ${folderId}: ${error.message}`);
      throw new AppError('Failed to get files from folder', 500);
    }
  }

  async getAllFilesMetadataFromFolder(folderId: string): Promise<FileMetadata[]> {
    try {
      let resources: any[] = [];
      let nextCursor: string | null = null;
  
      // Use do-while to process pagination
      do {
        const response = await cloudinary.api.resources({
          type: 'upload',
          prefix: folderId,
          max_results: 500,
          next_cursor: nextCursor,
        });
  
        resources = resources.concat(response.resources);
        nextCursor = response.next_cursor;
      } while (nextCursor);
  
      return resources.map(resource => this.mapToFileMetadata(resource));
    } catch (error: any) {
      logger.error(`Error fetching all files from folder ${folderId}: ${error.message}`);
      throw new AppError('Failed to get all files from folder', 500);
    }
  }

  // Metadata and streaming
  async getFileMetadata(fileId: string): Promise<FileMetadata> {
    return this.getFile(fileId);
  }

  async getFileStream(fileId: string): Promise<FileStreamResponse> {
    try {
      const metadata = await this.getFile(fileId);
      
      if (!metadata.url) {
        throw new AppError('File URL not available', 404);
      }
      
      const response = await axios({
        url: metadata.url,
        method: 'GET',
        responseType: 'stream', 
      });
  
      return {
        stream: response.data,
        mimeType: metadata.mimeType,
        name: metadata.name
      };
    } catch (error: any) {
      logger.error(`Error fetching file stream from Cloudinary: ${error.message}`);
      throw new AppError('Failed to get file stream', 500);
    }
  }

  // Helper methods
  private async uploadFileBuffer(fileBuffer: Buffer, folder: string, fileName: string): Promise<any> {
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
          resolve(result);
        }
      );
  
      uploadStream.end(fileBuffer);
    });
  }

  private mapToFileMetadata(resource: any): FileMetadata {
    return {
      id: resource.public_id,
      name: resource.public_id.split('/').pop(),
      path: resource.public_id,
      size: resource.bytes,
      mimeType: resource.resource_type + '/' + resource.format,
      url: resource.secure_url,
      createdAt: new Date(resource.created_at),
      modifiedAt: new Date(resource.last_updated)
    };
  }
}

// Singleton accessor
export const getCloudinaryService = (): CloudinaryStorageProvider => {
  return CloudinaryStorageProvider.getInstance();
};