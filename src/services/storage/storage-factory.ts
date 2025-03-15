import { StorageType } from '../../interfaces/file.interface';
import { LocalStorageProvider } from '../storage/local-storage.service';
import { S3StorageProvider } from '../storage/s3-storage.service';
import { CloudinaryStorageProvider } from '../storage/cloudinary-storage.service';
import { GoogleDriveStorageProvider } from '../storage/google-drive-storage.service';
import configs from '../../config/index';
import logger from '../../utils/logger';

export class StorageFactory {

  static getStorageProvider() {
    logger.info(`Creating storage provider for type: ${configs.storage.type}`);
    
    switch (configs.storage.type) {
      case StorageType.LOCAL:
        return new LocalStorageProvider();
      case StorageType.S3:
        return new S3StorageProvider();
      case StorageType.CLOUDINARY:
        return new CloudinaryStorageProvider();
      case StorageType.GOOGLE_DRIVE:
        return new GoogleDriveStorageProvider();
      default:
        logger.warn(`Unknown storage type: ${configs.storage.type}. Falling back to local storage.`);
        return new LocalStorageProvider();
    }
  }
}

