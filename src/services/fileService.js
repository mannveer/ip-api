import fs from 'fs';
import { promises as fs1 } from 'fs';
import path from 'path';
import File from '../models/fileModel.js';
import AppError from '../utils/errorHandler.js';
import { getAllFilesFromCloudinary,getFileFromCloudinary } from '../utils/cloudinary.js';
import logger from '../utils/logger.js';


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


export const getAllFilesInfo = async (dirPath) => {
  if (!dirPath) {
    throw new AppError('Directory path is required', 400);
  }
  try {
    const temp = await File.find({ isDeleted: false });
    console.log(temp);
    const filesInfo = await File.find({ dirpath: dirPath, isDeleted: false });
    if (!filesInfo || filesInfo.length === 0) {
      throw new AppError('No files found', 404);
    }
    logger.info('Successfully retrieved files info', filesInfo);
    return filesInfo;
  } catch (error) {
    logger.error(`Error retrieving files info: ${error.message}`);
    throw error;
  }
};

export const getFileInfo = async (fileId) => {
  if (!fileId) {
    throw new AppError('File ID is required', 400);
  }
  try {
    const fileInfo = await File.findById(fileId);
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


export const deleteFileInfo = async (fileId) => {
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



export const deleteFile = async (dirPath, filename, fileId) => {
  if (!dirPath || !filename || !fileId) {
    throw new AppError('Directory path, filename, and fileId are required', 400);
  }
  const filePath = path.join(dirPath, filename);

  try {
    await fs.promises.unlink(filePath);
    await File.findByIdAndUpdate(fileId, { isDeleted: true });
    logger.info(`File deleted and marked as deleted in database: ${filePath}`);
  } catch (error) {
    logger.error(`Error deleting file ${filename}: ${error.message}`);
    throw new AppError('Error deleting file', 500);
  }
};


export const fetchAllFiles = async () => {
  let allFiles = [];
  let nextCursor = null;
  let result = null;

  try {
    do {
      result = await getAllFilesFromCloudinary(nextCursor);
      if (result && result.resources) {
        allFiles = allFiles.concat(result.resources);
        nextCursor = result.next_cursor;
        logger.info(`Fetched ${result.resources.length} files from Cloudinary`);
      } else {
        nextCursor = null;
      }
    } while (nextCursor);
  } catch (error) {
    logger.error(`Error fetching files from Cloudinary: ${error.message}`);
    throw new AppError('Error fetching files from Cloudinary', 500);
  }

  return allFiles;
};


export const getFilePath = async (filesDirectory, fileName) => {
  try {
    const files = await fs.promises.readdir(filesDirectory);
    if (files.length === 0) {
      throw new AppError('No files found in directory', 404);
    }
    const matchedFile = files.find(file => file === fileName);
    if (!matchedFile) {
      throw new AppError('File not found in directory', 404);
    }
    logger.info(`File path retrieved: ${path.join(filesDirectory, matchedFile)}`);
    return path.join(filesDirectory, matchedFile);
  } catch (error) {
    logger.error(`Error fetching file path for ${fileName}: ${error.message}`);
    throw new AppError('Error fetching file path', 500);
  }
};


 export const getAbsolutePath = (dir,file) => {
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
  
  export const getFileFromDB = async (publicId) => {
    try {
      const result = await getFileFromCloudinary(publicId);
      logger.info(`File fetched from Cloudinary with public ID: ${publicId}`);
      return result;
    } catch (error) {
      logger.error(`Error fetching file from Cloudinary: ${error.message}`);
      throw new AppError('Error fetching file from Cloudinary', 500);
    }
  };
  