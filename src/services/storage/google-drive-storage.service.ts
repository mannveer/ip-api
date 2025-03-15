import { drive_v3, google } from 'googleapis';
import { Readable } from 'stream';
import { v4 as uuidv4 } from 'uuid';
import configs from '../../config';
import logger from '../../utils/logger';
import { AppError } from '../../utils/AppError';
import { GoogleDriveFileMetadata, GoogleDriveFileResponse, GoogleDriveStorageProviderInterface } from '../../interfaces/file.interface';

// Add type declaration for uuid
declare module 'uuid';


export class GoogleDriveStorageProvider implements GoogleDriveStorageProviderInterface {
  private drive: drive_v3.Drive | null = null;
  private rootFolders: Map<string, string> = new Map();
  private mimeTypeCache: Map<string, string> = new Map();
  
  // Common MIME types for quick lookup
  private static readonly COMMON_MIME_TYPES: Record<string, string> = {
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
  
  // Folder type constant to avoid repeated string literals
  private static readonly FOLDER_MIME_TYPE = 'application/vnd.google-apps.folder';
  
  // Cache expiration time (5 minutes)
  private static readonly CACHE_TTL = 5 * 60 * 1000;
  private folderCache: Map<string, {id: string, timestamp: number}> = new Map();

  async initialize(): Promise<void> {
    try {
      const credentials = JSON.parse(configs.google.drive);
      const auth = new google.auth.GoogleAuth({
        credentials,
        scopes: ['https://www.googleapis.com/auth/drive'],
      });
      
      const authClient = await auth.getClient();
      // Cast authClient to appropriate type
      this.drive = google.drive({ 
        version: 'v3', 
        auth: authClient as any 
      });
      
      // Initialize root folders in parallel
      await Promise.all([
        this.ensureRootFolder('files'),
        this.ensureRootFolder('sample-files'),
        this.ensureRootFolder('preview-files')
      ]);
      
      logger.info('Google Drive service initialized successfully');
    } catch (error: any) {
      logger.error(`Failed to initialize Google Drive service: ${error.message}`);
      throw new AppError('Failed to initialize Google Drive service', 500);
    }
  }

  private async ensureRootFolder(name: string): Promise<void> {
    const folderId = await this.findOrCreateFolder(name);
    this.rootFolders.set(name, folderId);
  }

  async uploadFile(file: Express.Multer.File, filename: string): Promise<{fileId: string, metadata: GoogleDriveFileMetadata}> {
    try {
      if (!this.drive) {
        throw new AppError('Google Drive service not initialized', 500);
      }
      
      const fileId = uuidv4();
      
      // Use a non-blocking stream from the buffer
      const stream = Readable.from(file.buffer);
      
      // Create file with proper metadata
      const uploadedFile = await this.drive.files.create({
        requestBody: {
          name: filename,
          parents: [this.rootFolders.get('files') || ''],
          properties: {
            'fileId': fileId,
            'originalName': file.originalname,
            'uploadDate': new Date().toISOString()
          }
        },
        media: {
          mimeType: file.mimetype,
          body: stream,
        },
        fields: 'id,size,mimeType',
      });

      const fileData = uploadedFile.data;
      
      logger.info(`File uploaded to Google Drive: ${filename} (${fileId})`);
      
      return {
        fileId,
        metadata: {
          id: fileData.id || '',
          size: parseInt(fileData.size || '0'),
          mimetype: fileData.mimeType || ''
        }
      };
    } catch (error: any) {
      logger.error(`Failed to upload file to Google Drive: ${error.message}`);
      throw new AppError('Failed to upload file to Google Drive', 500);
    }
  }

  async deleteFile(fileId: string): Promise<boolean> {
    try {
      if (!this.drive) {
        return false;
      }
      
      // Use more efficient query with indexed property
      const driveFileId = await this.getGoogleDriveFileIdByProperty('fileId', fileId);
      
      if (!driveFileId) {
        logger.warn(`No file found with fileId ${fileId}`);
        return false;
      }
      
      await this.drive.files.delete({ fileId: driveFileId });
      logger.info(`File deleted from Google Drive: ${driveFileId} (${fileId})`);
      return true;
    } catch (error: any) {
      logger.error(`Failed to delete file from Google Drive: ${error.message}`);
      return false;
    }
  }

  async getFileStream(fileId: string): Promise<{stream: Readable, mimetype: string}> {
    try {
      if (!this.drive) {
        throw new AppError('Google Drive service not initialized', 500);
      }
      
      const driveFileId = await this.getGoogleDriveFileIdByProperty('fileId', fileId);
      
      if (!driveFileId) {
        throw new AppError('File not found', 404);
      }
      
      // Get file metadata and stream in parallel
      const [fileMetadata, fileStream] = await Promise.all([
        this.drive.files.get({
          fileId: driveFileId,
          fields: 'mimeType'
        }),
        this.drive.files.get({
          fileId: driveFileId,
          alt: 'media'
        }, {
          responseType: 'stream'
        })
      ]);
      
      return {
        stream: fileStream.data as Readable,
        mimetype: fileMetadata.data.mimeType || 'application/octet-stream'
      };
    } catch (error: any) {
      logger.error(`Failed to get file stream from Google Drive: ${error.message}`);
      throw new AppError('Failed to get file stream', (error as any).code === 404 ? 404 : 500);
    }
  }

  async createSampleDirectory(name: string): Promise<string> {
    try {
      if (!this.drive) {
        throw new AppError('Google Drive service not initialized', 500);
      }
      
      const parentId = this.rootFolders.get('sample-files');
      if (!parentId) {
        throw new AppError('Sample files directory not found', 500);
      }
      
      const folderId = await this.createFolder(name, parentId);
      return folderId;
    } catch (error: any) {
      logger.error(`Failed to create sample directory: ${error.message}`);
      throw new AppError('Failed to create sample directory', 500);
    }
  }

  async createPreviewDirectory(name: string): Promise<string> {
    try {
      if (!this.drive) {
        throw new AppError('Google Drive service not initialized', 500);
      }
      
      const parentId = this.rootFolders.get('preview-files');
      if (!parentId) {
        throw new AppError('Preview files directory not found', 500);
      }
      
      const folderId = await this.createFolder(name, parentId);
      return folderId;
    } catch (error: any) {
      logger.error(`Failed to create preview directory: ${error.message}`);
      throw new AppError('Failed to create preview directory', 500);
    }
  }

  async uploadSampleFile(fileBuffer: Buffer, filename: string, parentFolderId: string): Promise<string> {
    return this.uploadBufferFile(fileBuffer, filename, parentFolderId);
  }

  async uploadPreviewFile(fileBuffer: Buffer, filename: string, parentFolderId: string): Promise<string> {
    return this.uploadBufferFile(fileBuffer, filename, parentFolderId);
  }

  private async uploadBufferFile(fileBuffer: Buffer, filename: string, parentFolderId: string): Promise<string> {
    try {
      if (!this.drive) {
        throw new AppError('Google Drive service not initialized', 500);
      }
      
      const stream = Readable.from(fileBuffer);
      
      const uploadedFile = await this.drive.files.create({
        requestBody: {
          name: filename,
          parents: [parentFolderId]
        },
        media: {
          mimeType: this.getMimeType(filename),
          body: stream,
        },
        fields: 'id',
      });

      return uploadedFile.data.id || '';
    } catch (error: any) {
      logger.error(`Failed to upload buffer file to Google Drive: ${error.message}`);
      throw new AppError('Failed to upload file', 500);
    }
  }

  async getSampleFiles(parentFolderId: string): Promise<GoogleDriveFileResponse[]> {
    return this.getFilesWithSharedUrls(parentFolderId);
  }

  async getPreviewFiles(parentFolderId: string): Promise<GoogleDriveFileResponse[]> {
    return this.getFilesWithSharedUrls(parentFolderId);
  }

  private async getFilesWithSharedUrls(parentFolderId: string): Promise<GoogleDriveFileResponse[]> {
    try {
      if (!this.drive) {
        return [];
      }
      
      const response = await this.drive.files.list({
        q: `'${parentFolderId}' in parents and trashed = false`,
        fields: 'files(id, name)',
        pageSize: 1000, // Optimize by fetching more files at once
      });

      if (!response.data.files?.length) {
        return [];
      }

      // Use Promise.all for concurrent processing
      const files = await Promise.all(response.data.files.map(async (file) => {
        if (!file.id || !this.drive) {
          return null;
        }
        
        // Make file publicly accessible and get web link
        await this.drive.permissions.create({
          fileId: file.id,
          requestBody: {
            role: 'reader',
            type: 'anyone',
          },
          fields: 'id',
          // Skip notification emails
          supportsAllDrives: false,
        });

        const fileInfo = await this.drive.files.get({
          fileId: file.id,
          fields: 'webViewLink,webContentLink',
        });

        // Use direct download link if available, otherwise fallback to web view
        return {
          url: fileInfo.data.webContentLink || fileInfo.data.webViewLink || '',
          name: file.name || 'Unnamed file'
        };
      }));

      // Filter out null values and cast to GoogleDriveFileResponse[]
      return files.filter((file): file is GoogleDriveFileResponse => file !== null);
    } catch (error: any) {
      logger.error(`Failed to get files with shared URLs: ${error.message}`);
      return [];
    }
  }

  async listFiles(directoryPath: string): Promise<any[]> {
    try {
      if (!this.drive) {
        return [];
      }
      
      const response = await this.drive.files.list({
        q: `'${directoryPath}' in parents and trashed = false`,
        fields: 'files(id, name, mimeType, size, modifiedTime)',
        pageSize: 1000, // Optimize by fetching more files at once
      });

      if (!response.data.files?.length) {
        return [];
      }

      return response.data.files.map(file => ({
        name: file.name || 'Unnamed file',
        path: file.id || '',
        size: parseInt(file.size || '0'),
        lastModified: file.modifiedTime || new Date().toISOString(),
        isFolder: file.mimeType === GoogleDriveStorageProvider.FOLDER_MIME_TYPE
      }));
    } catch (error: any) {
      logger.error(`Failed to list files from Google Drive: ${error.message}`);
      throw new AppError('Failed to list files', 500);
    }
  }

  private async getGoogleDriveFileIdByProperty(key: string, value: string): Promise<string | null> {
    if (!this.drive) {
      return null;
    }
    
    const query = `properties has { key='${key}' and value='${value}' } and trashed=false`;
    
    try {
      const response = await this.drive.files.list({
        q: query,
        fields: 'files(id)',
        pageSize: 1 // We only need one match
      });
      
      if (!response.data.files?.length) {
        return null;
      }
      
      return response.data.files[0].id || null;
    } catch (error: any) {
      logger.error(`Failed to get Drive file ID by property: ${error.message}`);
      return null;
    }
  }

  private async findOrCreateFolder(folderName: string, parentFolderId?: string): Promise<string> {
    // Check cache first
    const cacheKey = `${parentFolderId || 'root'}-${folderName}`;
    const cachedFolder = this.folderCache.get(cacheKey);
    
    if (cachedFolder && (Date.now() - cachedFolder.timestamp) < GoogleDriveStorageProvider.CACHE_TTL) {
      return cachedFolder.id;
    }
    
    try {
      if (!this.drive) {
        throw new AppError('Google Drive service not initialized', 500);
      }
      
      // Query to find existing folder
      const query = parentFolderId 
        ? `name='${folderName}' and '${parentFolderId}' in parents and mimeType='${GoogleDriveStorageProvider.FOLDER_MIME_TYPE}' and trashed=false`
        : `name='${folderName}' and mimeType='${GoogleDriveStorageProvider.FOLDER_MIME_TYPE}' and trashed=false`;
        
      const response = await this.drive.files.list({
        q: query,
        fields: 'files(id)',
        spaces: 'drive',
      });
  
      // Return existing folder if found
      if (response.data.files?.length && response.data.files[0].id) {
        const folderId = response.data.files[0].id;
        // Update cache
        this.folderCache.set(cacheKey, {id: folderId, timestamp: Date.now()});
        return folderId;
      }
  
      // Create new folder
      const newFolder = await this.createFolder(folderName, parentFolderId);
      // Update cache
      this.folderCache.set(cacheKey, {id: newFolder, timestamp: Date.now()});
      return newFolder;
    } catch (error: any) {
      logger.error(`Failed to find or create folder: ${error.message}`);
      throw new AppError('Failed to find or create folder', 500);
    }}

    private async createFolder(folderName: string, parentFolderId?: string): Promise<string> {
      try {
        if (!this.drive) {
          throw new AppError('Google Drive service not initialized', 500);
        }
        
        const response = await this.drive.files.create({
          requestBody: {
            name: folderName,
            mimeType: GoogleDriveStorageProvider.FOLDER_MIME_TYPE,
            ...(parentFolderId && { parents: [parentFolderId] }),
          },
          fields: 'id',
        });
    
        return response.data.id || '';
      } catch (error: any) {
        logger.error(`Failed to create folder: ${error.message}`);
        throw new AppError('Failed to create folder', 500);
      }
    }
  
    private getMimeType(filename: string): string {
      // Check cache first
      const ext = filename.split('.').pop()?.toLowerCase();
      
      if (!ext) {
        return 'application/octet-stream';
      }
      
      // Return from cache if available
      if (this.mimeTypeCache.has(ext)) {
        return this.mimeTypeCache.get(ext) || 'application/octet-stream';
      }
      
      // Look up in common types
      const mimeType = GoogleDriveStorageProvider.COMMON_MIME_TYPES[ext] || 'application/octet-stream';
      
      // Cache for future use
      this.mimeTypeCache.set(ext, mimeType);
      
      return mimeType;
    }

    async shareFile(fileId: string, email: string, role: string = 'reader'): Promise<void> {
      try {
        if (!this.drive) {
          throw new AppError('Google Drive service not initialized', 500);
        }
        
        await this.drive.permissions.create({
          fileId,
          requestBody: {
            role,
            type: 'user',
            emailAddress: email,
          },
          fields: 'id',
          sendNotificationEmail: true,
          // supportsAllDrives: false,
        });
        console.log(`File shared with ${email} as ${role}.`);
      } catch (error: any) {
        logger.error(`Failed to share file: ${error.message}`);
        throw new AppError('Failed to share file', 500);
      }
    }
  }
  
  let driveServiceInstance: GoogleDriveStorageProvider | null = null;
  let initPromise: Promise<GoogleDriveStorageProvider> | null = null;
  
  export const getDriveService = async (): Promise<GoogleDriveStorageProvider> => {
    if (driveServiceInstance) {
      return driveServiceInstance;
    }
    
    if (!initPromise) {
      initPromise = (async () => {
        const instance = new GoogleDriveStorageProvider();
        await instance.initialize();
        driveServiceInstance = instance;
        return instance;
      })();
    }
    
    return initPromise;
  };