import fs from 'fs/promises';
import { createReadStream, constants } from 'fs';
import path from 'path';
import { Readable } from 'stream';
import { FileMetadata, FileStreamResponse, IFileStorageProvider } from '../../interfaces/file.interface';
import logger from '../../utils/logger';
import { AppError } from '../../utils/AppError';

export class LocalStorageService implements IFileStorageProvider {
  private baseDir: string ;
  private filesDir: string;
  private foldersDir: string;

  constructor() {
    this.baseDir = path.join(process.cwd(), 'StorageFiles');
    this.filesDir = path.join(this.baseDir, 'files');
    this.foldersDir = path.join(this.baseDir, 'folders');
    
    // Ensure directories exist on initialization
    this.initDirectories();
  }

  private async initDirectories(): Promise<void> {
    try {
      await fs.mkdir(this.baseDir, { recursive: true });
      await fs.mkdir(this.filesDir, { recursive: true });
      await fs.mkdir(this.foldersDir, { recursive: true });
      logger.info('Local storage directories initialized');
    } catch (error) {
      logger.error(`Failed to initialize local storage directories: ${error.message}`);
    }
  }

  private async fileExists(filePath: string): Promise<boolean> {
    try {
      await fs.access(filePath, constants.F_OK);
      return true;
    } catch {
      return false;
    }
  }

  private getFilePath(fileId: string): string {
    return path.join(this.filesDir, fileId);
  }

  private getFolderPath(folderId: string): string {
    return path.join(this.foldersDir, folderId);
  }

  private async generateFileMetadata(fileId: string, filePath: string): Promise<FileMetadata> {
    try {
      const stats = await fs.stat(filePath);
      const fileName = path.basename(filePath);
      const extension = path.extname(fileName).substring(1);
      
      return {
        id: fileId,
        name: fileName,
        path: filePath,
        size: stats.size,
        mimeType: extension || 'application/octet-stream',
        createdAt: stats.birthtime,
        modifiedAt: stats.mtime
      };
    } catch (error) {
      logger.error(`Failed to generate file metadata: ${error.message}`);
      throw new AppError('Failed to generate file metadata', 500);
    }
  }

  async getFile(fileId: string): Promise<FileMetadata> {
    const filePath = this.getFilePath(fileId);
    
    if (!await this.fileExists(filePath)) {
      throw new AppError('File not found', 404);
    }
    
    return this.generateFileMetadata(fileId, filePath);
  }

  async getFiles(fileIds: string[]): Promise<FileMetadata[]> {
    const metadataPromises = fileIds.map(async fileId => {
      try {
        return await this.getFile(fileId);
      } catch (error) {
        logger.warn(`Failed to get file ${fileId}: ${error.message}`);
        return null;
      }
    });
    
    const results = await Promise.all(metadataPromises);
    return results.filter(result => result !== null);
  }

  async uploadFile(file: Express.Multer.File, fileName?: string): Promise<string> {
    try {
      const fileId = fileName || `${Date.now()}-${file.originalname}`;
      const filePath = this.getFilePath(fileId);
      
      // Write file to storage
      await fs.writeFile(filePath, await fs.readFile(file.path));
      
      // Clean up temp file if exists
      if (file.path && file.path !== filePath) {
        await fs.unlink(file.path).catch(err => 
          logger.warn(`Failed to remove temp file ${file.path}: ${err.message}`)
        );
      }
      
      logger.info(`File uploaded to local storage: ${filePath}`);
      return fileId;
    } catch (error) {
      logger.error(`Failed to upload file: ${error.message}`);
      throw new AppError('Failed to upload file', 500);
    }
  }

  async uploadFiles(files: Express.Multer.File[]): Promise<string[]> {
    const uploadPromises = files.map(file => this.uploadFile(file));
    return Promise.all(uploadPromises);
  }

  async deleteFile(fileId: string): Promise<boolean> {
    try {
      const filePath = this.getFilePath(fileId);
      
      if (!await this.fileExists(filePath)) {
        return false;
      }
      
      await fs.unlink(filePath);
      logger.info(`File deleted: ${filePath}`);
      return true;
    } catch (error) {
      logger.error(`Failed to delete file ${fileId}: ${error.message}`);
      return false;
    }
  }

  async deleteFiles(fileIds: string[]): Promise<boolean[]> {
    const deletePromises = fileIds.map(fileId => this.deleteFile(fileId));
    return Promise.all(deletePromises);
  }

  async createFolder(folderName: string, parentFolderId?: string): Promise<string> {
    try {
      const folderId = `${Date.now()}-${folderName}`;
      let folderPath: string;
      
      if (parentFolderId) {
        const parentPath = this.getFolderPath(parentFolderId);
        if (!await this.fileExists(parentPath)) {
          throw new AppError('Parent folder not found', 404);
        }
        folderPath = path.join(parentPath, folderId);
      } else {
        folderPath = this.getFolderPath(folderId);
      }
      
      await fs.mkdir(folderPath, { recursive: true });
      logger.info(`Folder created: ${folderPath}`);
      return folderId;
    } catch (error) {
      logger.error(`Failed to create folder: ${error.message}`);
      throw new AppError('Failed to create folder', 500);
    }
  }

  async getFilesFromFolder(folderId: string): Promise<FileMetadata[]> {
    try {
      const folderPath = this.getFolderPath(folderId);
      
      if (!await this.fileExists(folderPath)) {
        throw new AppError('Folder not found', 404);
      }
      
      const entries = await fs.readdir(folderPath, { withFileTypes: true });
      const files = entries.filter(entry => entry.isFile());
      
      const metadataPromises = files.map(async file => {
        const filePath = path.join(folderPath, file.name);
        return this.generateFileMetadata(file.name, filePath);
      });
      
      return Promise.all(metadataPromises);
    } catch (error) {
      logger.error(`Failed to get files from folder ${folderId}: ${error.message}`);
      throw new AppError('Failed to get files from folder', 500);
    }
  }

  async getAllFilesMetadataFromFolder(folderId: string): Promise<FileMetadata[]> {
    try {
      const folderPath = this.getFolderPath(folderId);
      
      if (!await this.fileExists(folderPath)) {
        throw new AppError('Folder not found', 404);
      }
      
      const allFiles: FileMetadata[] = [];
      
      // Function to recursively process directories
      const processDirectory = async (dirPath: string) => {
        const entries = await fs.readdir(dirPath, { withFileTypes: true });
        
        // Process all files in the current directory
        const fileEntries = entries.filter(entry => entry.isFile());
        for (const file of fileEntries) {
          const filePath = path.join(dirPath, file.name);
          const relativePath = path.relative(this.foldersDir, filePath);
          const fileId = relativePath.replace(/\\/g, '/');
          const metadata = await this.generateFileMetadata(fileId, filePath);
          allFiles.push(metadata);
        }
        
        // Recursively process all subdirectories
        const dirEntries = entries.filter(entry => entry.isDirectory());
        for (const dir of dirEntries) {
          await processDirectory(path.join(dirPath, dir.name));
        }
      };
      
      await processDirectory(folderPath);
      return allFiles;
    } catch (error) {
      logger.error(`Failed to get all files metadata from folder ${folderId}: ${error.message}`);
      throw new AppError('Failed to get all files metadata from folder', 500);
    }
  }

  async getFileMetadata(fileId: string): Promise<FileMetadata> {
    return this.getFile(fileId);
  }

  async getFileStream(fileId: string): Promise<FileStreamResponse> {
    try {
      const filePath = this.getFilePath(fileId);
      
      if (!await this.fileExists(filePath)) {
        throw new AppError('File not found', 404);
      }
      
      const stats = await fs.stat(filePath);
      const fileName = path.basename(filePath);
      const extension = path.extname(fileName).substring(1);
      
      return {
        stream: createReadStream(filePath),
        mimeType: extension || 'application/octet-stream',
        name: fileName
      };
    } catch (error) {
      logger.error(`Failed to get file stream for ${fileId}: ${error.message}`);
      throw new AppError('Failed to get file stream', 500);
    }
  }
}