import { S3Client, PutObjectCommand, DeleteObjectCommand, GetObjectCommand, ListObjectsV2Command, HeadObjectCommand } from '@aws-sdk/client-s3';
import { Upload } from '@aws-sdk/lib-storage';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { Readable } from 'stream';
import configs from '../../config';
import logger from '../../utils/logger';
import { AppError } from '../../utils/AppError';
import { v4 as uuidv4 } from 'uuid';
import { FileMetadata, FileStreamResponse, IFileStorageProvider } from '../../interfaces/file.interface';

export class S3StorageProvider implements IFileStorageProvider {
  private s3Client: S3Client;
  private bucket: string;
  private filePrefix: string;
  private folderPrefix: string;
  private urlExpirationSeconds: number;

  constructor() {
    this.s3Client = new S3Client({
      region: configs.aws.region,
      credentials: {
        accessKeyId: configs.aws.accessKeyId || '',
        secretAccessKey: configs.aws.secretAccessKey || ''
      }
    });
    this.bucket = configs.aws.bucket;
    this.filePrefix = 'files/';
    this.folderPrefix = 'folders/';
    this.urlExpirationSeconds = 3600; // 1 hour
  }

  async getFile(fileId: string): Promise<FileMetadata> {
    try {
      const key = this.getFileKey(fileId);
      const command = new HeadObjectCommand({
        Bucket: this.bucket,
        Key: key
      });
      
      const response = await this.s3Client.send(command);
      const fileName = decodeURIComponent(response.Metadata?.['original-name'] || key.split('/').pop());
      
      const presignedUrl = await this.generatePresignedUrl(key);
      
      return {
        id: fileId,
        name: fileName,
        path: key,
        size: response.ContentLength || 0,
        mimeType: response.ContentType || 'application/octet-stream',
        url: presignedUrl,
        createdAt: response.LastModified,
        modifiedAt: response.LastModified
      };
    } catch (error) {
      logger.error(`Failed to get file from S3: ${error.message}`);
      throw new AppError('File not found', 404);
    }
  }

  async getFiles(fileIds: string[]): Promise<FileMetadata[]> {
    try {
      const filePromises = fileIds.map(fileId => this.getFile(fileId));
      return await Promise.all(filePromises);
    } catch (error) {
      logger.error(`Failed to get multiple files from S3: ${error.message}`);
      throw new AppError('Failed to get files', 500);
    }
  }

  async uploadFile(file: Express.Multer.File, fileName?: string): Promise<string> {
    try {
      const fileId = uuidv4();
      const finalFileName = fileName || `${fileId}-${file.originalname}`;
      const key = `${this.filePrefix}${finalFileName}`;
      
      const upload = new Upload({
        client: this.s3Client,
        params: {
          Bucket: this.bucket,
          Key: key,
          Body: file.buffer || Readable.from([file.buffer]),
          ContentType: file.mimetype,
          Metadata: {
            'original-name': encodeURIComponent(file.originalname),
            'file-id': fileId
          }
        },
        queueSize: 4,
        partSize: 5 * 1024 * 1024
      });

      await upload.done();
      logger.info(`File uploaded to S3: ${key}`);
      
      return fileId;
    } catch (error) {
      logger.error(`Failed to upload file to S3: ${error.message}`);
      throw new AppError('Failed to upload file', 500);
    }
  }

  async uploadFiles(files: Express.Multer.File[]): Promise<string[]> {
    try {
      const uploadPromises = files.map(file => this.uploadFile(file));
      return await Promise.all(uploadPromises);
    } catch (error) {
      logger.error(`Failed to upload multiple files to S3: ${error.message}`);
      throw new AppError('Failed to upload files', 500);
    }
  }

  async deleteFile(fileId: string): Promise<boolean> {
    try {
      const key = this.getFileKey(fileId);
      const command = new DeleteObjectCommand({
        Bucket: this.bucket,
        Key: key
      });
      
      await this.s3Client.send(command);
      logger.info(`File deleted from S3: ${key}`);
      return true;
    } catch (error) {
      logger.error(`Failed to delete file from S3: ${error.message}`);
      return false;
    }
  }

  async deleteFiles(fileIds: string[]): Promise<boolean[]> {
    try {
      const deletePromises = fileIds.map(fileId => this.deleteFile(fileId));
      return await Promise.all(deletePromises);
    } catch (error) {
      logger.error(`Failed to delete multiple files from S3: ${error.message}`);
      throw new AppError('Failed to delete files', 500);
    }
  }

  async createFolder(folderName: string, parentFolderId?: string): Promise<string> {
    try {
      const folderId = uuidv4();
      let folderPath = `${this.folderPrefix}${folderId}/`;
      
      if (parentFolderId) {
        // Get parent folder path first
        const parentPath = await this.getFolderPath(parentFolderId);
        folderPath = `${parentPath}${folderName}/`;
      }
      
      // S3 doesn't need actual folder creation, but we'll create an empty marker object
      const command = new PutObjectCommand({
        Bucket: this.bucket,
        Key: folderPath,
        Body: '',
        ContentType: 'application/x-directory',
        Metadata: {
          'folder-id': folderId,
          'folder-name': encodeURIComponent(folderName)
        }
      });
      
      await this.s3Client.send(command);
      logger.info(`Folder created in S3: ${folderPath}`);
      
      return folderId;
    } catch (error) {
      logger.error(`Failed to create folder in S3: ${error.message}`);
      throw new AppError('Failed to create folder', 500);
    }
  }

  async getFilesFromFolder(folderId: string): Promise<FileMetadata[]> {
    try {
      const folderPath = await this.getFolderPath(folderId);
      
      const command = new ListObjectsV2Command({
        Bucket: this.bucket,
        Prefix: folderPath,
        Delimiter: '/'
      });
      
      const response = await this.s3Client.send(command);
      
      if (!response.Contents) {
        return [];
      }
      
      // Filter out the folder object itself and get metadata for all remaining objects
      const files = response.Contents.filter(object => 
        object.Key !== folderPath && !object.Key.endsWith('/')
      );
      
      const fileMetadataPromises = files.map(async (file) => {
        const headCommand = new HeadObjectCommand({
          Bucket: this.bucket,
          Key: file.Key
        });
        
        const headResponse = await this.s3Client.send(headCommand);
        const fileId = headResponse.Metadata?.['file-id'] || file.Key.split('/').pop();
        const fileName = decodeURIComponent(headResponse.Metadata?.['original-name'] || file.Key.split('/').pop());
        const presignedUrl = await this.generatePresignedUrl(file.Key);
        
        return {
          id: fileId,
          name: fileName,
          path: file.Key,
          size: file.Size || 0,
          mimeType: headResponse.ContentType || 'application/octet-stream',
          url: presignedUrl,
          createdAt: file.LastModified,
          modifiedAt: file.LastModified
        };
      });
      
      return await Promise.all(fileMetadataPromises);
    } catch (error) {
      logger.error(`Failed to get files from folder in S3: ${error.message}`);
      throw new AppError('Failed to get files from folder', 500);
    }
  }

  async getAllFilesMetadataFromFolder(folderId: string): Promise<FileMetadata[]> {
    try {
      const folderPath = await this.getFolderPath(folderId);
      
      const command = new ListObjectsV2Command({
        Bucket: this.bucket,
        Prefix: folderPath,
        // No delimiter to get all objects recursively
      });
      
      const response = await this.s3Client.send(command);
      
      if (!response.Contents) {
        return [];
      }
      
      // Filter out directory objects
      const files = response.Contents.filter(object => !object.Key.endsWith('/'));
      
      const fileMetadataPromises = files.map(async (file) => {
        const headCommand = new HeadObjectCommand({
          Bucket: this.bucket,
          Key: file.Key
        });
        
        const headResponse = await this.s3Client.send(headCommand);
        const fileId = headResponse.Metadata?.['file-id'] || file.Key.split('/').pop();
        const fileName = decodeURIComponent(headResponse.Metadata?.['original-name'] || file.Key.split('/').pop());
        const presignedUrl = await this.generatePresignedUrl(file.Key);
        
        return {
          id: fileId,
          name: fileName,
          path: file.Key,
          size: file.Size || 0,
          mimeType: headResponse.ContentType || 'application/octet-stream',
          url: presignedUrl,
          createdAt: file.LastModified,
          modifiedAt: file.LastModified
        };
      });
      
      return await Promise.all(fileMetadataPromises);
    } catch (error) {
      logger.error(`Failed to get all files metadata from folder in S3: ${error.message}`);
      throw new AppError('Failed to get files metadata', 500);
    }
  }

  async getFileMetadata(fileId: string): Promise<FileMetadata> {
    return this.getFile(fileId);
  }

  async getFileStream(fileId: string): Promise<FileStreamResponse> {
    try {
      const key = this.getFileKey(fileId);
      
      const command = new GetObjectCommand({
        Bucket: this.bucket,
        Key: key
      });
      
      const response = await this.s3Client.send(command);
      const fileName = decodeURIComponent(response.Metadata?.['original-name'] || key.split('/').pop());
      
      return {
        stream: response.Body as Readable,
        mimeType: response.ContentType || 'application/octet-stream',
        name: fileName
      };
    } catch (error) {
      logger.error(`Failed to get file stream from S3: ${error.message}`);
      throw new AppError('File not found', 404);
    }
  }

  // Helper methods
  private async generatePresignedUrl(key: string): Promise<string> {
    const command = new GetObjectCommand({
      Bucket: this.bucket,
      Key: key
    });
    
    return getSignedUrl(this.s3Client, command, { expiresIn: this.urlExpirationSeconds });
  }

  private getFileKey(fileId: string): string {
    return fileId.startsWith(this.filePrefix) ? fileId : `${this.filePrefix}${fileId}`;
  }

  private async getFolderPath(folderId: string): Promise<string> {
    if (folderId.endsWith('/')) {
      return folderId;
    }
    
    try {
      // Try to find folder marker object to get its actual path
      const command = new ListObjectsV2Command({
        Bucket: this.bucket,
        Prefix: `${this.folderPrefix}${folderId}/`,
        MaxKeys: 1
      });
      
      const response = await this.s3Client.send(command);
      
      if (response.Contents && response.Contents.length > 0) {
        // Found the folder
        return response.Contents[0].Key;
      }
      
      // If not found with folder prefix, assume the ID is the full path
      return folderId.endsWith('/') ? folderId : `${folderId}/`;
    } catch (error) {
      logger.error(`Failed to get folder path from S3: ${error.message}`);
      // Default to just using the ID with the folder prefix
      return `${this.folderPrefix}${folderId}/`;
    }
  }
}