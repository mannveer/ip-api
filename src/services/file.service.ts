import {
  FileDocument,
  FileStreamResponse,
  FileUploadResponse,
  IFileService,
  StorageType
} from '../interfaces/file.interface';
import File from '../models/file.model';
import {StorageFactory} from './storage/storage-factory';
import { AppError } from '../utils/AppError';
import logger from '../utils/logger';
import configs from '../config';
import { RequestHandler } from 'express';
import { workerData, Worker } from 'worker_threads';
import os from 'os';
import path from 'path';

export default class FileService implements IFileService {
  private maxConcurrency: number;

  constructor() {
    // Set concurrency based on available CPU cores, but not to exceed 4
    this.maxConcurrency = Math.min(os.cpus().length - 1, 4);
    if (this.maxConcurrency < 1) this.maxConcurrency = 1;
  }

  async uploadFile(file: Express.Multer.File): Promise<FileUploadResponse> {
    try {
      const storageProvider = StorageFactory.getStorageProvider();
      
      // Generate a unique filename
      const uniqueName = `${Date.now()}-${Math.round(Math.random() * 1E9)}-${file.originalname}`;
      
      // Upload file to storage
      const fileId = await storageProvider.uploadFile(file, uniqueName);
      
      // Create sample and preview folders
      const sampleFolderId = await storageProvider.createSampleFolder(uniqueName);
      const previewFolderId = await storageProvider.createPreviewFolder(uniqueName);
      
      // Prepare the file document for database
      const fileModel = this.createFileDocument(
        file, 
        uniqueName, 
        fileId, 
        sampleFolderId, 
        previewFolderId
      );
      
      // Save file metadata to database
      const savedFile = await this.insertFileInfo(fileModel);
      
      logger.info(`File uploaded successfully: ${uniqueName}`);
      
      return {
        message: 'File uploaded successfully',
        file: {
          originalname: file.originalname,
          filename: uniqueName,
          size: file.size,
          mimetype: file.mimetype
        }
      };
    } catch (error) {
      logger.error(`Error uploading file: ${error.message}`);
      throw new AppError('Failed to upload file', 500);
    }
  }

  async uploadFiles(files: Express.Multer.File[]): Promise<{ message: string, files: { filename: string }[] }> {
    try {
      if (!files || files.length === 0) {
        throw new AppError('No files provided', 400);
      }

      const storageProvider = StorageFactory.getStorageProvider();
      
      // Use worker threads for parallel processing of large batches
      if (files.length > 5) {
        return this.parallelUploadFiles(files);
      }
      
      // For smaller batches, process sequentially
      const uploadedFiles = await storageProvider.uploadFiles(files);
      
      // Process each uploaded file
      for (const [index, uploadedFile] of uploadedFiles.entries()) {
        // Create sample and preview folders
        const sampleFolderId = await storageProvider.createSampleFolder(uploadedFile.newfilename);
        const previewFolderId = await storageProvider.createPreviewFolder(uploadedFile.newfilename);
        
        // Prepare and save file metadata
        const fileModel = this.createFileDocument(
          files[index],
          uploadedFile.newfilename,
          uploadedFile.fileId,
          sampleFolderId,
          previewFolderId
        );
        
        await this.insertFileInfo(fileModel);
      }
      
      logger.info(`${files.length} files uploaded successfully`);
      
      return {
        message: 'Files uploaded successfully',
        files: files.map(file => ({ filename: file.originalname }))
      };
    } catch (error) {
      logger.error(`Error uploading files: ${error.message}`);
      throw new AppError('Failed to upload files', 500);
    }
  }

  private async parallelUploadFiles(files: Express.Multer.File[]): Promise<{ message: string, files: { filename: string }[] }> {
    // Divide the files into batches based on the number of CPU cores
    const batchSize = Math.ceil(files.length / this.maxConcurrency);
    const batches = [];
    
    for (let i = 0; i < files.length; i += batchSize) {
      batches.push(files.slice(i, i + batchSize));
    }
    
    // Create a worker for each batch
    const workerPromises = batches.map(async (batch, index) => {
      return new Promise((resolve, reject) => {
        const worker = new Worker(
          path.join(__dirname, 'workers', 'file-upload.worker.js'),
          {
            workerData: {
              batch,
              storageType: configs.multer.storage
            }
          }
        );
        
        worker.on('message', resolve);
        worker.on('error', reject);
        worker.on('exit', (code) => {
          if (code !== 0) {
            reject(new Error(`Worker stopped with exit code ${code}`));
          }
        });
      });
    });
    
    // Wait for all workers to complete
    const results = await Promise.all(workerPromises);
    
    // Flatten the results
    const uploadedFiles = results.flat();
    
    // Save file metadata to database
    for (const file of uploadedFiles) {
      await this.insertFileInfo(file.fileModel);
    }
    
    return {
      message: 'Files uploaded successfully',
      files: files.map(file => ({ filename: file.originalname }))
    };
  }

  private createFileDocument(
    file: Express.Multer.File,
    filename: string,
    fileId: string,
    sampleFolderId: string,
    previewFolderId: string
  ): any {
    const baseDoc = {
      originalfilename: file.originalname,
      filename: filename,
      size: `${(file.size / (1024 * 1024)).toFixed(2)} MB`,
      mimetype: file.mimetype,
      description: file.description || '',
      price: file.price || 0,
      isDeleted: false
    };
    
    // Add storage-specific metadata
    switch (configs.multer.storage) {
      case StorageType.LOCAL:
        return {
          ...baseDoc,
          dirpath: configs.filePaths.files
        };
      case StorageType.CLOUDINARY:
        return {
          ...baseDoc,
          dirpath: 'NA',
          cloudinary: {
            fileId: fileId,
            sampleFolderPath: sampleFolderId,
            previewFolderPath: previewFolderId
          }
        };
      case StorageType.GOOGLE_DRIVE:
        return {
          ...baseDoc,
          dirpath: 'NA',
          googleDrive: {
            fileId: fileId,
            sampleFolderId: sampleFolderId,
            previewFolderId: previewFolderId
          }
        };
      default:
        return baseDoc;
    }
  }

  private async insertFileInfo(fileInfo: any): Promise<FileDocument> {
    try {
      const file = new File(fileInfo);
      await file.save();
      logger.info(`File info saved to database for file: ${fileInfo.filename}`);
      return file;
    } catch (error) {
      logger.error(`Error saving file info to database: ${error.message}`);
      throw new AppError('Error saving file info to database', 500);
    }
  }

  async getFileMetadata(fileId: string): Promise<FileDocument> {
    if (!fileId) {
      throw new AppError('File ID is required', 400);
    }
    
    try {
      const fileInfo = await File.findOne({ _id: fileId, isDeleted: false })
        .select('-isDeleted');
      
      if (!fileInfo) {
        throw new AppError('No file found', 404);
      }
      
      logger.info(`File metadata retrieved: ${fileId}`);
      return fileInfo;
    } catch (error) {
      logger.error(`Error retrieving file metadata: ${error.message}`);
      throw error instanceof AppError ? error : new AppError('Failed to retrieve file metadata', 500);
    }
  }

  async getAllFilesMetadata(): Promise<FileDocument[]> {
    try {
      const query = configs.multer.storage === StorageType.LOCAL 
        ? { dirpath: configs.filePaths.files, isDeleted: false } 
        : { dirpath: 'NA', isDeleted: false };
      
      let filesInfo = await File.find(query)
        .select('-isDeleted')
        .lean();
      
      if (filesInfo.length === 0) {
        return [];
      }
      
      // If using Cloudinary, get preview URLs
      if (configs.multer.storage === StorageType.CLOUDINARY) {
        filesInfo = await this.enrichWithCloudinaryPreviewUrls(filesInfo);
      }
      
      logger.info(`Retrieved ${filesInfo.length} file metadata records`);
      return filesInfo;
    } catch (error) {
      logger.error(`Error retrieving file metadata: ${error.message}`);
      throw new AppError('Failed to retrieve file metadata', 500);
    }
  }

  private async enrichWithCloudinaryPreviewUrls(filesInfo: FileDocument[]): Promise<FileDocument[]> {
    try {
      const storageProvider = StorageFactory.getStorageProvider();
      const files = await this.cloudinaryHelper.getAllFilesInFolder(
        configs.cloudindarydrive.previewFolderName
      );
      
      if (files.length === 0) {
        return filesInfo;
      }
      
      const fileMap = new Map(
        files.map(file => [
          file.asset_folder.slice(configs.cloudindarydrive.previewFolderName.length + 1),
          file.secure_url
        ])
      );
      
      return filesInfo.map(file => ({
        ...file,
        previewUrl: fileMap.get(file.filename) || ""
      }));
    } catch (error) {
      logger.error(`Error enriching files with Cloudinary URLs: ${error.message}`);
      return filesInfo;
    }
  }

  async getFileStream(fileId: string): Promise<FileStreamResponse> {
    try {
      // First, get file metadata from database
      const fileInfo = await this.getFileMetadata(fileId);
      
      // Get the appropriate storage provider
      const storageProvider = StorageFactory.getStorageProvider();
      
      // Determine the actual file ID to request based on storage type
      let actualFileId: string;
      
      if (configs.multer.storage === StorageType.LOCAL) {
        actualFileId = fileInfo.filename;
      } else if (configs.multer.storage === StorageType.CLOUDINARY && fileInfo.cloudinary) {
        actualFileId = fileInfo.cloudinary.fileId;
      } else if (configs.multer.storage === StorageType.GOOGLE_DRIVE && fileInfo.googleDrive) {
        actualFileId = fileInfo.googleDrive.fileId;
      } else {
        throw new AppError('Invalid file storage configuration', 500);
      }
      
      // Get the file stream from the storage provider
      const fileStream = await storageProvider.getFileStream(actualFileId);
      
      logger.info(`File stream retrieved for file: ${fileId}`);
      return fileStream;
    } catch (error) {
      logger.error(`Error getting file stream: ${error.message}`);
      throw error instanceof AppError ? error : new AppError('Failed to get file stream', 500);
    }
  }

  async deleteFile(fileId: string): Promise<void> {
    try {
      // Get file metadata
      const fileInfo = await this.getFileMetadata(fileId);
      
      // Get the storage provider
      const storageProvider = StorageFactory.getStorageProvider();
      
      // Determine the actual file ID to delete
      let actualFileId: string;
      
      if (configs.multer.storage === StorageType.LOCAL) {
        actualFileId = fileInfo.filename;
      } else if (configs.multer.storage === StorageType.CLOUDINARY && fileInfo.cloudinary) {
        actualFileId = fileInfo.cloudinary.fileId;
      } else if (configs.multer.storage === StorageType.GOOGLE_DRIVE && fileInfo.googleDrive) {
        actualFileId = fileInfo.googleDrive.fileId;
      } else {
        throw new AppError('Invalid file storage configuration', 500);
      }
      
      // Delete the file from storage
      await storageProvider.deleteFile(actualFileId);
      
      // Mark the file as deleted in the database
      await File.findByIdAndUpdate(fileId, { isDeleted: true });
      
      logger.info(`File deleted: ${fileId}`);
    } catch (error) {
      logger.error(`Error deleting file: ${error.message}`);
      throw error instanceof AppError ? error : new AppError('Failed to delete file', 500);
    }
  }

  async getSampleFiles(fileName: string): Promise<string[]> {
    try {
      if (!fileName) {
        throw new AppError('File name is required', 400);
      }
      
      // Get the file metadata
      const fileInfo = await File.findOne({ filename: fileName, isDeleted: false });
      
      if (!fileInfo) {
        throw new AppError('File not found', 404);
      }
      
      // Get the storage provider
      const storageProvider = StorageFactory.getStorageProvider();
      
      // Get the sample folder ID based on storage type
      let sampleFolderId: string;
      
      if (configs.multer.storage === StorageType.LOCAL) {
        sampleFolderId = path.join(configs.filePaths.sampleFiles, fileName);
        