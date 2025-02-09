import fs from 'fs';
import { promises as fs1 } from 'fs';
import path from 'path';
import File from '../models/fileModel.js';
import AppError from '../utils/errorHandler.js';
import { cloudinaryServiceInstance } from '../utils/cloudinary.js';
import logger from '../utils/logger.js';
import { driveServiceInstance } from "../utils/gDrive.js";
import configs from '../config/index.js';
import { file } from 'googleapis/build/src/apis/file/index.js';


export const createDirectory = async (dirPaths) => {
  try {
    for (const dirPath of dirPaths) {
      await fs.promises.mkdir(dirPath, { recursive: true });
      logger.info(`Directory created at ${dirPath}`);
    }
  } catch (error) {
    logger.error(`Failed to create directory: ${error.message}`);
    throw new AppError('Failed to create directory', 500);
  }
};

export const deleteMultipleDirectories = async (dirPaths) => {
  try {
    for (const dirPath of dirPaths) {
      await fs.promises.rmdir(dirPath, { recursive: true });
      logger.info(`Directory deleted: ${dirPath}`);
    }
  }
  catch (error) {
    logger.error(`Error deleting directories: ${error.message}`);
    throw new AppError('Error deleting directories', 500);
  }
};

export const insertFileInfo = async (fileInfo) => {
  try {
    const file = new File(fileInfo);
    await file.save();
    logger.info(`File info saved to database for file: ${fileInfo.filename}`);
    return file;
  } catch (error) {
    logger.error(`Error saving file info to database: ${error.message}`);
    throw new AppError('Error saving file info to database', 500);
  }
};


export const getFilesInfo = async (dirPath = null) => {
  if (!dirPath && configs.multer.storage === 'local') {
    throw new AppError('Directory path is required', 400);
  }
  try {
    const query = configs.multer.storage === 'local' ? { dirpath: dirPath, isDeleted: false } : { dirpath: 'NA', isDeleted: false };
    let filesInfo = await File.find(query).select('-dirpath -googleDrive -cloudinary -isDeleted');
    if(filesInfo.length === 0){
      return [];
    }

    if(configs.multer.storage === 'cloudinary'){
      filesInfo = await getAllCloudinaryFilesUrl(configs.cloudindarydrive.previewFolderName, filesInfo);
    }

    logger.info('Successfully retrieved files info', filesInfo);
    return filesInfo;
  } catch (error) {
    logger.error(`Error retrieving files info: ${error.message}`);
    return [];
  }
};


export const getFileInfo = async (fileId) => {
  if (!fileId) {
    throw new AppError('File ID is required', 400);
  }
  try {
    const fileInfo = await File.findOne({ _id: fileId, isDeleted: false }).select('-dirpath -googleDrive -isDeleted -cloudinary');
    if (!fileInfo) {
      throw new AppError('No file found', 404);
    }
    logger.info(`File retrieved: ${fileId}`);
    console.log(fileInfo)
    return fileInfo;
  } catch (error) {
    logger.error(`Error retrieving file info for ID ${fileId}: ${error.message}`);
    throw error;
  }
};

export const getFileInfo1 = async (fileId) => {
  if (!fileId) {
    throw new AppError('File ID is required', 400);
  }
  try {
    const fileInfo = await File.findOne({ _id: fileId, isDeleted: false });
    if (!fileInfo) {
      throw new AppError('No file found', 404);
    }
    logger.info(`File retrieved: ${fileId}`);
    return fileInfo;
  } catch (error) {
    logger.error(`Error retrieving file info for ID ${fileId}: ${error.message}`);
    throw error;
  }
};


export const updateDeleteFileInfo = async (fileId) => {
  if (!fileId) {
    throw new AppError('File ID is required', 400);
  }
  try {
    const fileInfo = await File.findByIdAndUpdate(fileId, { isDeleted: true });
    if (!fileInfo) {
      throw new AppError('No file found to delete', 404);
    }
    logger.info(`File marked as deleted in database: ${fileId}`);
  } catch (error) {
    logger.error(`Error marking file as deleted: ${error.message}`);
    throw new AppError('Error deleting file', 500);
  }
};



export const getFile1 = async (dirPath, filename, res) => {
  if (!dirPath || !filename) {
    throw new AppError('Directory path and filename are required', 400);
  }

  const filePath = path.join(dirPath, filename);
  try {
    await fs.promises.access(filePath, fs.constants.F_OK);
    logger.info(`File exists: ${filePath}`);

    // Stream file for immediate response
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    const readStream = fs.createReadStream(filePath);
    readStream.pipe(res);
    readStream.on('error', (err) => {
      logger.error(`Error streaming file: ${err.message}`);
      res.status(500).json({ message: 'Error downloading file' });
    });
  } catch (error) {
    logger.error(`File does not exist or cannot be accessed: ${error.message}`);
    throw new AppError('File not found', 404);
  }
};



export const deleteFile = async (filepath) => {
  if (!filepath) {
    throw new AppError('File path is required', 400);
  }

  try {
    await fs.promises.unlink(filePath);
  } catch (error) {
    logger.error(`Error deleting file from ${filePath}: ${error.message}`);
    throw new AppError('Error deleting file', 500);
  }
};

export const deleteFileInfo = async (fileId) => {
  if (!fileId) {
    throw new AppError('File ID is required', 400);
  }
  try {
    const fileInfo = await File.findByIdAndDelete(fileId);
    if (!fileInfo) {
      throw new AppError('No file found to delete', 404);
    }
    logger.info(`File deleted from database: ${fileId}`);
    return fileInfo;
  } catch (error) {
    logger.error(`Error deleting file: ${error.message}`);
    throw new AppError('Error deleting file', 500);
  }
};


export const getAbsolutePath = (dir, file) => {
  return path.join(dir, file);
}


export const getFilePaths = async (filesDirectory) => {
  try {
    const files = await fs.promises.readdir(filesDirectory);
    if (files.length === 0) {
      logger.warn('No files found in directory');
      return [];
    }
    const filePaths = files.map(file => path.join(filesDirectory, file));
    logger.info(`Fetched ${filePaths.length} file paths`);
    return filePaths;
  } catch (error) {
    logger.error(`Error fetching file paths: ${error.message}`);
    throw new AppError('Error fetching file paths', 500);
  }
};

export const uploadFilesToGoogleDrive = async (files) => {
  const uploadedFiles = await Promise.all(files.map(async (file) => {
    try {
      const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
      const newfilename = file.originalname + '-' + uniqueSuffix;
      const fileId = await driveServiceInstance.uploadFile(file.buffer, newfilename, configs.googleDrive.filesFolderId, file.mimetype);
      return { newfilename, fileId };
    } catch (error) {
      logger.error(`Error uploading file to Google Drive: ${error.message}`);
      return null;
    }
  }));

  for (const [index, file] of uploadedFiles.entries()) {
    if (file) {
      try {
        const sampleFolderId = await driveServiceInstance.createFolder(file.newfilename, configs.googleDrive.sampleFolderId);
        const previewFolderId = await driveServiceInstance.createFolder(file.newfilename, configs.googleDrive.previewFolderId);
        const fileModel = {
          originalfilename: files[index].originalname,
          filename: file.newfilename,
          size: `${(files[index].size / (1024 * 1024)).toFixed(2)} MB`,
          mimetype: files[index].mimetype,
          description: files[index].description ?? 'temp1',
          price: files[index].price ?? 0,
          googleDrive: { fileId: file.fileId, sampleFolderId, previewFolderId }
        };
        await insertFileInfo(fileModel);
      } catch (error) {
        logger.error(`Error processing file ${files[index]}: ${error.message}`);
        throw new AppError('Error processing file', 500);
      }
    }
  }
};


export const getFileStreamFromGoogleDrive = async (fileId) => {
  try {
    // const file = await driveServiceInstance.downloadFile(fileId);
    const file = await driveServiceInstance.getFileStream(fileId);
    logger.info(`File fetched from Google Drive with ID: ${fileId}`);
    return file;
  } catch (error) {
    logger.error(`Error fetching file from Google Drive: ${error.message}`);
    throw new AppError('Error fetching file from Google Drive', 500);
  }
}


export const getGoogleDriveFilesFromFolder = async (folderId) => {
  try {
    const files = await driveServiceInstance.listFiles(folderId);
    console.log("folderId - ", folderId);
    logger.info(`Fetched ${files.length} files from Google Drive folder: ${folderId}`);
    return files;
  } catch (error) {
    logger.error(`Error fetching files from Google Drive folder: ${error.message}`);
    throw new AppError('Error fetching files from Google Drive folder', 500);
  }
}

export const getGoogleDriveDetailsDb = async (filename) => {
  try {
    const file = await File.findOne({ filename: filename });
    if (!file) {
      throw new AppError('No file found with Google Drive ID', 404);
    }
    return file.googleDrive;
  } catch (error) {
    logger.error(`Error fetching file from database: ${error.message}`);
    throw new AppError('Error fetching file from database', 500);
  }
}

export const deleteAllFilesFromGoogleDriveAndDB = async () => {
  try {
    const filesdetails = await getFilesInfo();
    await Promise.all(filesdetails.map(async (file) => {
      await driveServiceInstance.deleteFile(file.googleDrive.fileId);
      await driveServiceInstance.deleteFile(file.googleDrive.sampleFolderId);
      await driveServiceInstance.deleteFile(file.googleDrive.previewFolderId);
    }));
    await File.deleteMany({ dirpath: 'NA' });

    logger.info('All files deleted from Google Drive');
  } catch (error) {
    logger.error(`Error deleting files from Google Drive: ${error.message}`);
    throw new AppError('Error deleting files from Google Drive', 500);
  }
}

export const shareFileOnGoogleDrive = async (fileId, email, role = 'reader') => {
  try {
    await driveServiceInstance.shareFile(fileId, email, role);
  } catch (error) {
    logger.error(`Error sharing file on Google Drive: ${error.message}`);
    throw new AppError('Error sharing file on Google Drive', 500);
  }
};

export const uploadFilesToCloudinary = async (files) => {
  const uploadedFiles = await Promise.all(files.map(async (file) => {
    try {
      // const response = await cloudinaryServiceInstance.upload(file.buffer, configs.cloudindarydrive.filesFolderName);
      const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
      const newfilename = file.originalname + '-' + uniqueSuffix;
      const response = await cloudinaryServiceInstance.uploadFileBuffer(file.buffer, configs.cloudindarydrive.filesFolderName,file.originalname);
      return { asset_id: response.asset_id, secure_url: response.secure_url, newfilename };
    } catch (error) {
      logger.error(`Error uploading file to Cloudinary: ${error.message}`);
      return null;
    }
  }));

  for (const [index, file] of uploadedFiles.entries()) {
    if (file) {
      const sampleFolderRes = await cloudinaryServiceInstance.createSubFolder(configs.cloudindarydrive.sampleFolderName, file.newfilename);
      const previewFolderRes = await cloudinaryServiceInstance.createSubFolder(configs.cloudindarydrive.previewFolderName, file.newfilename);
      const fileModel = {
        originalfilename: files[index].originalname,  
        filename: file.newfilename,
        size: `${(files[index].size / (1024 * 1024)).toFixed(2)} MB`,
        mimetype: files[index].mimetype,
        description: files[index].description ?? "",
        price: files[index].price ?? 0,
        cloudinary: {
          fileId: file.asset_id,
          sampleFolderPath: sampleFolderRes.path,
          previewFolderPath: previewFolderRes.path,
        },
      };

      await insertFileInfo(fileModel);
    }
  }

}

export const uploadFilesToGoogleCloudinary = async (files) => {
  const uploadedFiles = await Promise.all(files.map(async (file) => {
    try {
      // const response = await cloudinaryServiceInstance.upload(file.buffer, configs.cloudindarydrive.filesFolderName);
      const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
      const newfilename = file.originalname + '-' + uniqueSuffix;
      const gfileId = await driveServiceInstance.uploadFile(file.buffer, newfilename, configs.googleDrive.filesFolderId, file.mimetype);
      // const response = await cloudinaryServiceInstance.uploadFileBuffer(file.buffer, configs.cloudindarydrive.filesFolderName,file.originalname);
      return { gfileId, newfilename, uniqueSuffix };
    } catch (error) {
      logger.error(`Error uploading file to Cloudinary: ${error.message}`);
      return null;
    }
  }));

  for (const [index, file] of uploadedFiles.entries()) {
    if (file) {
      const sampleFolderRes = await cloudinaryServiceInstance.createSubFolder(configs.cloudindarydrive.sampleFolderName, file.newfilename);
      const previewFolderRes = await cloudinaryServiceInstance.createSubFolder(configs.cloudindarydrive.previewFolderName, file.newfilename);
      const fileModel = {
        originalfilename: files[index].originalname,  
        filename: file.newfilename,
        size: `${(files[index].size / (1024 * 1024)).toFixed(2)} MB`,
        mimetype: files[index].mimetype,
        description: files[index].description ?? "",
        price: files[index].price ?? 0,
        cloudinary: {
          fileId: "NA-"+file.uniqueSuffix,
          sampleFolderPath: sampleFolderRes.path,
          previewFolderPath: previewFolderRes.path,
        },
        googleDrive: { 
          fileId: file.gfileId,
          sampleFolderId: "NA",
          previewFolderId: "NA"
        }
      };

      await insertFileInfo(fileModel);
    }
  }

}


export const getCloudinaryFilesFromFolder = async (folder) => {

  try {
    const files = await cloudinaryServiceInstance.getFileFromFolder(folder);
    logger.info(`Fetched ${files.length} files from Cloudinary folder: ${folder}`);
    return files;
  } catch (error) {
    logger.error(`Error fetching files from Cloudinary folder: ${error.message}`);
    throw new AppError('Error fetching files from Cloudinary folder', 500);
  }
}

export const getAllCloudinaryFilesUrl = async (dirPath, filesArr) => {
  try {
    const files = await cloudinaryServiceInstance.getAllFilesInFolder(dirPath);

    if (files.length === 0) {
      return filesArr;
    }
    logger.info(`Fetched ${files.length} files from Cloudinary folder: ${dirPath}`);

    const fileMap = new Map(files.map(file => [file.asset_folder.slice(configs.cloudindarydrive.previewFolderName.length + 1), file.secure_url]));

    filesArr.forEach(file => {
      file.previewUrl = fileMap.get(file.filename) || "";
    });
    return filesArr;
  } catch (error) {
    logger.error(`Error fetching files from Cloudinary folder: ${error.message}`);
    return filesArr;
  }
}



export const getFileStreamFromCloudinary = async (publicId) => {
  try {
    const file = await cloudinaryServiceInstance.fetchFileStream(publicId);
    logger.info(`File fetched from Cloudinary with public ID: ${publicId}`);
    return file;
  } catch (error) {
    logger.error(`Error fetching file from Cloudinary: ${error.message}`);
    throw new AppError('Error fetching file from Cloudinary', 500);
  }
}

export const getCloudinaryFiles = async () => {
  try {
    const files = await cloudinaryServiceInstance.getAllFiles();
    logger.info(`Fetched ${files.length} files from Cloudinary`);
    return files;
  } catch (error) {
    logger.error(`Error fetching files from Cloudinary: ${error.message}`);
    throw new AppError('Error fetching files from Cloudinary', 500);
  }
}

export const deleteFileFromCloudinary = async (publicId) => {
  try {
    await cloudinaryServiceInstance.deleteFile(publicId);
    logger.info(`File deleted from Cloudinary with public ID: ${publicId}`);
  } catch (error) {
    logger.error(`Error deleting file from Cloudinary: ${error.message}`);
    throw new AppError('Error deleting file from Cloudinary', 500);
  }
}

export const deleteAllFilesFromCloudinaryAndDB = async () => {
  try {
    const files = await getCloudinaryFiles();
    await Promise.all(files.map(async (file) => {
      await cloudinaryServiceInstance.deleteFile(file.publicId);
    }));
    await File.deleteMany({ dirpath: 'NA' });

    logger.info('All files deleted from Cloudinary');
  } catch (error) {
    logger.error(`Error deleting files from Cloudinary: ${error.message}`);
    throw new AppError('Error deleting files from Cloudinary', 500);
  }
}

