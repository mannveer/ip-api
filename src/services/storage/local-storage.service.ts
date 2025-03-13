import { StorageProviderInterface } from '../../interfaces/file.interface';
import fs from 'fs/promises';
import path from 'path';
import { createReadStream } from 'fs';
import { promisify } from 'util';
import { pipeline } from 'stream';
import configs from '../../config/index';
import logger from '../../utils/logger';
import { AppError } from '../../utils/AppError';

const pipelineAsync = promisify(pipeline);

export class LocalStorageProvider implements StorageProviderInterface {
  private baseDir: string;
  private filesDir: string;
  private sampleDir: string;
  private previewDir: string;

  constructor() {
    this.baseDir = path.join(process.cwd(), 'DeliveryFiles');
    this.filesDir = path.join(this.baseDir, 'files');
    this.sampleDir = path.join(this.baseDir, 'sample-files');
    this.previewDir = path.join(this.baseDir, 'preview-files');
    
    // Ensure directories exist
    this.initDirectories();
  }

  private async initDirectories(): Promise<void> {
    try {
      await fs.mkdir(this.baseDir, { recursive: true });
      await fs.mkdir(this.filesDir, { recursive: true });
      await fs.mkdir(this.sampleDir, { recursive: true });
      await fs.mkdir(this.previewDir, { recursive: true });
      logger.info('Local storage directories initialized');
    } catch (error) {
      logger.error(`Failed to initialize local storage directories: ${error.message}`);
    }
  }

  async uploadFile(file: Express.Multer.File, filename: string): Promise<{fileId: string, metadata: any}> {
    try {
      const filePath = path.join(this.filesDir, filename);
      
      // Using streams for efficient memory usage
      const writeStream = createReadStream(file.path);
      const readStream = fs.writeFile(filePath, await fs.readFile(file.path));
      
      // Remove temp file if multer creates one
      if (file.path && file.path !== filePath) {
        await fs.unlink(file.path).catch(err => 
          logger.warn(`Failed to remove temp file ${file.path}: ${err.message}`)
        );
      }
      
      logger.info(`File uploaded to local storage: ${filePath}`);
      
      return {
        fileId: filename,
        metadata: {
          path: filePath,
          size: file.size,
          mimetype: file.mimetype
        }
      };
    } catch (error) {
      logger.error(`Failed to upload file to local storage: ${error.message}`);
      throw new AppError('Failed to upload file to local storage', 500);
    }
  }

  async deleteFile(fileId: string): Promise<boolean> {
    try {
      const filePath = path.join(this.filesDir, fileId);
      await fs.unlink(filePath);
      logger.info(`File deleted from local storage: ${filePath}`);
      return true;
    } catch (error) {
      logger.error(`Failed to delete file from local storage: ${error.message}`);
      return false;
    }
  }

  async getFileStream(fileId: string): Promise<any> {
    try {
      const filePath = path.join(this.filesDir, fileId);
      await fs.access(filePath, fs.constants.F_OK);
      
      return {
        stream: createReadStream(filePath),
        mimetype: path.extname(filePath).substring(1) // Basic mime type detection
      };
    } catch (error) {
      logger.error(`Failed to get file stream from local storage: ${error.message}`);
      throw new AppError('File not found', 404);
    }
  }

  async createSampleDirectory(filename: string): Promise<string> {
    try {
      const dirPath = path.join(this.sampleDir, filename);
      await fs.mkdir(dirPath, { recursive: true });
      logger.info(`Sample directory created: ${dirPath}`);
      return dirPath;
    } catch (error) {
      logger.error(`Failed to create sample directory: ${error.message}`);
      throw new AppError('Failed to create sample directory', 500);
    }
  }

  async createPreviewDirectory(filename: string): Promise<string> {
    try {
      const dirPath = path.join(this.previewDir, filename);
      await fs.mkdir(dirPath, { recursive: true });
      logger.info(`Preview directory created: ${dirPath}`);
      return dirPath;
    } catch (error) {
      logger.error(`Failed to create preview directory: ${error.message}`);
      throw new AppError('Failed to create preview directory', 500);
    }
  }

  async uploadSampleFile(file: Buffer, filename: string, parentPath: string): Promise<string> {
    try {
      const filePath = path.join(parentPath, filename);
      await fs.writeFile(filePath, file);
      logger.info(`Sample file uploaded: ${filePath}`);
      return filePath;
    } catch (error) {
      logger.error(`Failed to upload sample file: ${error.message}`);
      throw new AppError('Failed to upload sample file', 500);
    }
  }

  async uploadPreviewFile(file: Buffer, filename: string, parentPath: string): Promise<string> {
    try {
      const filePath = path.join(parentPath, filename);
      await fs.writeFile(filePath, file);
      logger.info(`Preview file uploaded: ${filePath}`);
      return filePath;
    } catch (error) {
      logger.error(`Failed to upload preview file: ${error.message}`);
      throw new AppError('Failed to upload preview file', 500);
    }
  }

  async getSampleFiles(parentPath: string): Promise<{url: string, name: string}[]> {
    try {
      const files = await fs.readdir(parentPath);
      return files.map(file => ({
        url: `file://${path.join(parentPath, file)}`,
        name: file
      }));
    } catch (error) {
      logger.error(`Failed to get sample files: ${error.message}`);
      return [];
    }
  }

  async getPreviewFiles(parentPath: string): Promise<{url: string, name: string}[]> {
    try {
      const files = await fs.readdir(parentPath);
      return files.map(file => ({
        url: `file://${path.join(parentPath, file)}`,
        name: file
      }));
    } catch (error) {
      logger.error(`Failed to get preview files: ${error.message}`);
      return [];
    }
  }

  async listFiles(directoryPath: string): Promise<any[]> {
    try {
      const files = await fs.readdir(directoryPath);
      return Promise.all(files.map(async (file) => {
        const filePath = path.join(directoryPath, file);
        const stats = await fs.stat(filePath);
        return {
          name: file,
          path: filePath,
          size: stats.size,
          isDirectory: stats.isDirectory(),
          createdAt: stats.birthtime,
          modifiedAt: stats.mtime
        };
      }));
    } catch (error) {
      logger.error(`Failed to list files: ${error.message}`);
      throw new AppError('Failed to list files', 500);
    }
  }
}
