import fs from 'fs';
import { promises as fs1 } from 'fs';
import path from 'path';
import File from '../models/fileModel.js';
import appError from '../utils/errorHandler.js';
import { getAllFilesFromCloudinary,getFileFromCloudinary } from '../utils/cloudinary.js';



export const createDirectory = async (dirPath, folderName) => {
  const fullPath = folderName ? path.join(dirPath, folderName) : dirPath;
      try {
        await fs.promises.mkdir(fullPath, { recursive: true })
      } catch (err) {
        console.error('Failed creating a directory:', err);
        throw new appError('Failed creating a directory', 404);
      }
}


export const insertFileInfo = async (fileInfo) => {
  if (!fileInfo) {
    throw new appError('File info is required', 400);
  }

  const file = new File(fileInfo);
  try {
    await file.save();
  } catch (error) {
    console.error(error)
    throw new appError('Error saving file', 500);
  }
  return file;
}

export const getAllFilesInfo = async (dirPath) => {
    if (!dirPath) {
      throw new appError('Directory path is required', 400);
    }
    const filesInfo = await File.find({ dirpath: dirPath, isDeleted: false });      
    if (!filesInfo) {
      throw new appError('No files found', 404);
    }
    return filesInfo;
}

export const getFileInfo = async (fileId) => {
  if (!fileId) {
    throw new appError('fileId is required', 400);
  }
  const fileInfo = await File.find({ _id: fileId});      
  if (!fileInfo) {
    throw new appError('No file found', 404);
  }
  return fileInfo;
}


export const deleteFileInfo = async (fileId) => {
  if (!fileId) {
    throw new appError('fileId is required', 400);
  }
  const fileInfo = await File.find({ _id: fileId});      
  if (!fileInfo) {
    throw new appError('No file found', 404);
  }

  fileInfo.isDeleted = true;
  try {
    fileInfo.isDeleted = true;
    await fileInfo.save();
  } catch (error) {
    throw new appError('Error deleting file', 500);
  }
}


export const getFile1 = async (dirPath, filename, res) => {
  if (!dirPath || !filename) {
    throw new appError('Directory path and filename are required', 400);
  }

  const filePath = path.join(dirPath, filename);
  try {
    await fs.promises.access(filePath, fs.constants.F_OK);
  } catch (err) {
    console.error('File does not exist or cannot be accessed:', err);
    throw new appError('File not found', 404);
  }

  res.download(filePath, filename, (err) => {
    if (err) {
      throw new appError('Error downloading file', 500);
    }
  });
};


export const deleteFile = async (dirPath, filename, fileId) => {
  if (!dirPath || !filename || !fileId) {
    throw new appError('Directory path, filename and fileId are required', 400);
  }
  const filePath = path.join(dirPath, filename);

  try {
    await fs.promises.unlink(filePath);
    await File.findByIdAndUpdate({_id:fileId}, { isDeleted: true });
  } catch (err) {
    console.error('Error deleting file:', err);
    throw new appError('Error deleting file', 500);
  }
}

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
        } else {
          nextCursor = null;
        }
      } while (nextCursor);
    } catch (error) {
      if (error instanceof AggregateError) {
        for (const individualError of error.errors) {
          console.error('Individual error:', individualError);
        }
      } else {
        console.error('Error fetching files from Cloudinary:', error);
      }
    }
  
    return allFiles;
  };

  export const getFilePath = async (filesDirectory,fileName) => {
    try {
      const files = await fs1.readdir(filesDirectory);
      if (files.length === 0) {
        return null;
      }
      // const file = files.find(file => file.startsWith(fileName));
      // if (!file) {
      //   return null;
      // }
      return path.join(filesDirectory, files[0]);
    } catch (error) {
      throw new Error('Error fetching file path');
    }
  };

 export const getExactPath = (dir,file) => {
    return path.join(dir, file);
  }



  export const getFilePaths = async (filesDirectory) => {
    try {
      const files = await fs1.readdir(filesDirectory);
      if (files.length === 0) {
        return [];
      }
      return files.map(file => path.join(filesDirectory, file));
    } catch (error) {
      throw new appError('Error fetching file paths', 500);
    }
  };
  

 export const getFileFromDB = (publicId) => {
    return new Promise((resolve, reject) => {
      getFileFromCloudinary(publicId)
        .then((result) => {
          resolve(result);
        })
        .catch((error) => {
          reject(error);
        });
    });
  }

