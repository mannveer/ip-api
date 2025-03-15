import { Readable } from 'stream';
export interface FileMetadata {
    originalfilename: string;
    filename: string;
    size: string;
    mimetype: string;
    description?: string;
    price: number;
    previewUrl?: string;
  }
  
  export interface FileInfo {
    originalFilename: string;
    filename: string;
    size: string;
    mimetype: string;
    price: number;
    description?: string;
    previewUrl?: string;
    isDeleted: boolean;
    createdAt: Date;
    updatedAt: Date;
    
    googleDrive?: GoogleDriveMetadata;
    cloudinary?: CloudinaryMetadata;
    s3?: S3Metadata;
    local?: LocalMetadata;
  }
  
  export interface CloudinaryMetadata {
    fileId: string;
    previewFolderPath: string;
    sampleFolderPath: string;
  }
  
  export interface S3Metadata {
    fileId: string;
    bucket: string;
    key: string;
    samplePrefix: string;
    previewPrefix: string;
  }
  
  export interface LocalMetadata {
    dirpath: string;
    sampleDirpath: string;
    previewDirpath: string;
  }
  
  
  export interface FileDocument extends FileMetadata {
    _id?: string;
    dirpath?: string;
    googleDrive?: GoogleDriveMetadata;
    cloudinary?: CloudinaryMetadata;
    s3?: S3Metadata;
    local?: LocalMetadata;
    isDeleted: boolean;
    updatedAt: Date;
  }
  
  export interface FileUploadResponse {
    message: string;
    file: {
      originalname: string;
      filename: string;
      path?: string;
      size: number;
      mimetype: string;
    };
  }

  
  export interface FileStreamResponse {
    data: NodeJS.ReadableStream;
    name?: string;
    mimeType?: string;
  }

  
  // Interface for file storage providers
  export interface IStorageProvider {
    uploadFile(file: Express.Multer.File, fileName: string): Promise<string>;
    uploadFiles(files: Express.Multer.File[], prefix?: string): Promise<{newfilename: string, fileId: string}[]>;
    getFileStream(fileId: string): Promise<FileStreamResponse>;
    deleteFile(fileId: string): Promise<void>;
    createSampleFolder(fileName: string): Promise<string>;
    createPreviewFolder(fileName: string): Promise<string>;
    getFilesFromFolder(folderId: string): Promise<any[]>;
    deleteAllFiles(fileIds: string[]): Promise<void>;
  }
  
  export enum StorageType {
    LOCAL = 'local',
    S3 = 's3',
    CLOUDINARY = 'cloudinary',
    GOOGLE_DRIVE = 'drive'
  }
  
  export interface StorageConfig {
    type: StorageType;
    basePath?: string;
    credentials?: any;
  }
  
  // FileService interface
  export interface IFileService {
    uploadFile(file: Express.Multer.File): Promise<FileUploadResponse>;
    uploadFiles(files: Express.Multer.File[]): Promise<{ message: string, files: { filename: string }[] }>;
    getFileMetadata(fileId: string): Promise<FileDocument>;
    getAllFilesMetadata(): Promise<FileDocument[]>;
    getFileStream(fileId: string): Promise<FileStreamResponse>;
    deleteFile(fileId: string): Promise<void>;
    getSampleFiles(fileId: string): Promise<string[]>;
    getPreviewFile(fileId: string): Promise<FileStreamResponse>;
    deleteAllFiles(): Promise<void>;
  }



  // google-drive-storage.interface.ts

export interface GoogleDriveMetadata {
    fileId: string;
    sampleFolderId: string;
    previewFolderId: string;
  }

export interface GoogleDriveFileResponse {
    url: string;
    name: string;
  }
  
export interface GoogleDriveFileMetadata {
    id: string;
    size: number;
    mimetype: string;
  }

export interface GoogleDriveStorageProviderInterface {
  initialize(): Promise<void>;
  uploadFile(file: Express.Multer.File, filename: string): Promise<{
    fileId: string;
    metadata: any;
  }>;
  deleteFile(fileId: string): Promise<boolean>;
  getFileStream(fileId: string): Promise<{
    stream: Readable;
    mimetype: string;
  }>;
  createSampleDirectory(name: string): Promise<string>;
  createPreviewDirectory(name: string): Promise<string>;
  uploadSampleFile(fileBuffer: Buffer, filename: string, parentPath: string): Promise<string>;
  uploadPreviewFile(fileBuffer: Buffer, filename: string, parentPath: string): Promise<string>;
  getSampleFiles(parentPath: string): Promise<{
    url: string;
    name: string;
  }[]>;
  getPreviewFiles(parentPath: string): Promise<{
    url: string;
    name: string;
  }[]>;
  listFiles(directoryPath: string): Promise<any[]>;
}


  