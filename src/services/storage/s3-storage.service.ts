import { S3Client, PutObjectCommand, DeleteObjectCommand, GetObjectCommand, ListObjectsV2Command } from '@aws-sdk/client-s3';
import { Upload } from '@aws-sdk/lib-storage';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { Readable } from 'stream';
import configs from '../../config';
import logger from '../../utils/logger';
import { AppError } from '../../utils/AppError'
import { v4 as uuidv4 } from 'uuid';

export class S3StorageProvider {
  private s3Client: S3Client;
  private bucket: string;
  private filePrefix: string;
  private samplePrefix: string;
  private previewPrefix: string;

  constructor() {
    this.s3Client = new S3Client({
      region: configs.aws.region,
      credentials: {
        accessKeyId: configs.aws.accessKeyId,
        secretAccessKey: configs.aws.secretAccessKey
      }
    });
    this.bucket = configs.aws.bucket;
    this.filePrefix = 'files/';
    this.samplePrefix = 'sample-files/';
    this.previewPrefix = 'preview-files/';
  }

  async uploadFile(file: Express.Multer.File, filename: string): Promise<{fileId: string, metadata: any}> {
    try {
      const key = `${this.filePrefix}${filename}`;
      const fileId = uuidv4();
      
      // Use multipart upload for large files to improve performance
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
        queueSize: 4, // number of concurrent uploads
        partSize: 5 * 1024 * 1024 // 5MB per part
      });

      const result = await upload.done();
      logger.info(`File uploaded to S3: ${key}`);
      
      return {
        fileId,
        metadata: {
          bucket: this.bucket,
          key,
          etag: result.ETag,
          size: file.size,
          mimetype: file.mimetype
        }
      };
    } catch (error) {
      logger.error(`Failed to upload file to S3: ${error.message}`);
      throw new AppError('Failed to upload file to S3', 500);
    }
  }

  async deleteFile(fileId: string): Promise<boolean> {
    try {
      // Assuming fileId is the S3 key or we have a way to map it
      const command = new DeleteObjectCommand({
        Bucket: this.bucket,
        Key: fileId.startsWith(this.filePrefix) ? fileId : `${this.filePrefix}${fileId}`
      });
      
      await this.s3Client.send(command);
      logger.info(`File deleted from S3: ${fileId}`);
      return true;
    } catch (error) {
      logger.error(`Failed to delete file from S3: ${error.message}`);
      return false;
    }
  }

  async getFileStream(fileId: string): Promise<any> {
    try {
      const key = fileId.startsWith(this.filePrefix) ? fileId : `${this.filePrefix}${fileId}`;
      
      const command = new GetObjectCommand({
        Bucket: this.bucket,
        Key: key
      });
      
      const response = await this.s3Client.send(command);
      
      return {
        stream: response.Body as Readable,
        mimetype: response.ContentType
      };
    } catch (error) {
      logger.error(`Failed to get file stream from S3: ${error.message}`);
      throw new AppError('File not found', 404);
    }
  }

  async createSampleDirectory(filename: string): Promise<string> {
    // S3 doesn't need directory creation, just use prefix pattern
    const samplePath = `${this.samplePrefix}${filename}/`;
    logger.info(`S3 sample directory path: ${samplePath}`);
    return samplePath;
  }

  async createPreviewDirectory(filename: string): Promise<string> {
    // S3 doesn't need directory creation, just use prefix pattern
    const previewPath = `${this.previewPrefix}${filename}/`;
    logger.info(`S3 preview directory path: ${previewPath}`);
    return previewPath;
  }

  async uploadSampleFile(file: Buffer, filename: string, parentPath: string): Promise<string> {
    try {
      const key = `${parentPath}${filename}`;
      
      const command = new PutObjectCommand({
        Bucket: this.bucket,
        Key: key,
        Body: file,
        ContentType: this.getMimeType(filename)
      });
      
      await this.s3Client.send(command);
      logger.info(`Sample file uploaded to S3: ${key}`);
      
      return key;
    } catch (error) {
      logger.error(`Failed to upload sample file to S3: ${error.message}`);
      throw new AppError('Failed to upload sample file to S3', 500);
    }
  }

  async uploadPreviewFile(file: Buffer, filename: string, parentPath: string): Promise<string> {
    try {
      const key = `${parentPath}${filename}`;
      
      const command = new PutObjectCommand({
        Bucket: this.bucket,
        Key: key,
        Body: file,
        ContentType: this.getMimeType(filename)
      });
      
      await this.s3Client.send(command);
      logger.info(`Preview file uploaded to S3: ${key}`);
      
      return key;
    } catch (error) {
      logger.error(`Failed to upload preview file to S3: ${error.message}`);
      throw new AppError('Failed to upload preview file to S3', 500);
    }
  }

  async getSampleFiles(parentPath: string): Promise<{url: string, name: string}[]> {
    try {
      const command = new ListObjectsV2Command({
        Bucket: this.bucket,
        Prefix: parentPath,
        Delimiter: '/'
      });
      
      const response = await this.s3Client.send(command);
      
      if (!response.Contents) {
        return [];
      }
      
      const getUrlPromises = response.Contents.map(async (object) => {
        const getCommand = new GetObjectCommand({
          Bucket: this.bucket,
          Key: object.Key
        });
        
        // Generate pre-signed URL that expires in 1 hour
        const url = await getSignedUrl(this.s3Client, getCommand, { expiresIn: 3600 });
        
        return {
          url,
          name: object.Key.split('/').pop()
        };
      });
      
      return Promise.all(getUrlPromises);
    } catch (error) {
      logger.error(`Failed to get sample files from S3: ${error.message}`);
      return [];
    }
  }

  async getPreviewFiles(parentPath: string): Promise<{url: string, name: string}[]> {
    try {
      const command = new ListObjectsV2Command({
        Bucket: this.bucket,
        Prefix: parentPath,
        Delimiter: '/'
      });
      
      const response = await this.s3Client.send(command);
      
      if (!response.Contents) {
        return [];
      }
      
      const getUrlPromises = response.Contents.map(async (object) => {
        const getCommand = new GetObjectCommand({
          Bucket: this.bucket,
          Key: object.Key
        });
        
        // Generate pre-signed URL that expires in 1 hour
        const url = await getSignedUrl(this.s3Client, getCommand, { expiresIn: 3600 });
        
        return {
          url,
          name: object.Key.split('/').pop()
        };
      });
      
      return Promise.all(getUrlPromises);
    } catch (error) {
      logger.error(`Failed to get preview files from S3: ${error.message}`);
      return [];
    }
  }

  private getMimeType(filename: string): string {
    const ext = filename.split('.').pop().toLowerCase();
    
    const mimeTypes = {
      'jpg': 'image/jpeg',
      'jpeg': 'image/jpeg',
      'png': 'image/png',
      'gif': 'image/gif',
      'webp': 'image/webp',
      'pdf': 'application/pdf',
      'zip': 'application/zip',
      'txt': 'text/plain',
      'html': 'text/html',
      'css': 'text/css',
      'js': 'application/javascript',
      'json': 'application/json'
    };
    
    return mimeTypes[ext] || 'application/octet-stream';
  }

  async listFiles(directoryPath: string): Promise<any[]> {
    try {
      const command = new ListObjectsV2Command({
        Bucket: this.bucket,
        Prefix: directoryPath,
        Delimiter: '/'
      });
      
      const response = await this.s3Client.send(command);
      
      if (!response.Contents) {
        return [];
      }
      
      return response.Contents.map(object => ({
        name: object.Key.split('/').pop(),
        path: object.Key,
        size: object.Size,
        lastModified: object.LastModified
      }));
    } catch (error) {
      logger.error(`Failed to list files from S3: ${error.message}`);
      throw new AppError('Failed to list files from S3', 500);
    }
  }
}
