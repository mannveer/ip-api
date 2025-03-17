import { IFileStorageProvider, StorageType } from '../../interfaces/file.interface';
import { LocalStorageService } from '../storage/local-storage.service';
import { S3StorageProvider } from '../storage/s3-storage.service';
import { getCloudinaryService } from '../storage/cloudinary-storage.service';
import { GoogleDriveStorageProvider } from '../storage/google-drive-storage.service';
import configs from '../../config/index';
import logger from '../../utils/logger';

export class StorageFactory {

  static getStorageProvider(): IFileStorageProvider {
    logger.info(`Creating storage provider for type: ${configs.storage.type}`);
    
    switch (configs.storage.type) {
      case StorageType.LOCAL:
        return new LocalStorageService();
      case StorageType.S3:
        return new S3StorageProvider();
      case StorageType.CLOUDINARY:
        return getCloudinaryService();
      case StorageType.GOOGLE_DRIVE:
        // return new GoogleDriveStorageProvider();
      default:
        logger.warn(`Unknown storage type: ${configs.storage.type}. Falling back to local storage.`);
        return new LocalStorageService();
    }
  }
}

