// import {getFileFromDB, fetchAllFiles} from '../services/fileService.js';
// import {deleteFileFromCloudinary,uploadOnCloudinary} from '../utils/cloudinary.js';
import {getFilePath, getFile1,getFileInfo,getAllFilesInfo,deleteFile, insertFileInfo, createDirectory, getFilePaths } from '../services/fileService.js';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

// const __filename = fileURLToPath(import.meta.url);
// const __dirname = path.dirname(__filename);
// const FILES_DIR_PATH = path.join(__dirname, '..', '..', 'DeliveryFiles', 'files');
// const SAMPLE_FILES_DIR_PATH = path.join(__dirname, '..', '..', 'DeliveryFiles', 'sample-files');
// const PREVIEW_FILES_DIR_PATH = path.join(__dirname, '..', '..', 'DeliveryFiles', 'preview-files');

const DELIVERY_FILES_DIR = path.join(process.cwd(), 'DeliveryFiles');
const FILES_DIR_PATH = path.join(DELIVERY_FILES_DIR, 'files');
const SAMPLE_FILES_DIR_PATH = path.join(DELIVERY_FILES_DIR, 'sample-files');
const PREVIEW_FILES_DIR_PATH = path.join(DELIVERY_FILES_DIR, 'preview-files');

export const uploadFile = async (req, res) => {
    try {
        console.log(req.body)

        if (!req.file) {
            return res.status(400).send({ message: 'No file uploaded' });
          }
      
          const file = req.file;
          const filePath = path.join(FILES_DIR_PATH, file.filename);
          

            const fileModel = {
            originalfilename: file.originalname,
            filename: file.filename,
            dirpath: FILES_DIR_PATH,
            size: `${(file.size / (1024 * 1024)).toFixed(2)} MB`,
            mimetype: file.mimetype,
            description: file.description ?? '',
            price: file.price ?? 0,
            sampleFiles: file.sampleFiles ?? [],
            samplefilesdirpath: SAMPLE_FILES_DIR_PATH + file.filename
            };

            await createDirectory(SAMPLE_FILES_DIR_PATH,file.filename);
            await createDirectory(PREVIEW_FILES_DIR_PATH,file.filename);
            
            await insertFileInfo(fileModel);
          res.status(200).send({
            message: 'File uploaded successfully',
            file: {
              originalname: file.originalname,
              filename: file.filename,
              path: filePath,
              size: file.size,
              mimetype: file.mimetype
            }
          });
    } catch (error) {
        res.status(500).json({message: error.message});
    }
}

export const getSampleFileByFileName = async (req, res, next) => {
    try {
        const fileName = req.params.filename;
        const filePaths = await getFilePaths(`${SAMPLE_FILES_DIR_PATH}\\${fileName}`);        if (!filePaths) {
            if (!filePaths || filePaths.length === 0) {
                return res.status(404).send('File not found');
              }
            }
        // res.sendFile(filePaths);
        const fileUrls = filePaths.map(filePath => {
            return `${req.protocol}://${req.get('host')}/api/v1/file/file-sample/${fileName}/${path.basename(filePath)}`;
          });
        res.json({
            status: 'success',
            message: 'Files retrieved successfully',
            data: fileUrls,
          });
      } catch (error) {
        next(error);
      }
}

export const getFile = async (req, res) => {
    try {
        const filePath = req.params.type === 'sample' ? path.join(SAMPLE_FILES_DIR_PATH, req.params.filename) : FILES_DIR_PATH;
        req.params.filename = req.params.type === 'sample' ? req.params.filename+".zip" : req.params.filename;
        await getFile1(filePath, req.params.filename, res);
    } catch (error) {
        res.status(500).json({message: error.message});
    }
}

export const getFileDetails = async (req, res) => {
    try {
        console.log("req.params.fileId - ",req.params.fileId)
        const fileInfo = await getFileInfo(req.params.fileId);
        res.status(200).json(fileInfo);
    } catch (error) {
        res.status(500).json({message: error.message});
    }
}

export const getAllFilesDetails = async (req, res) => {
    try {
        console.log("Searching files at - ", FILES_DIR_PATH)
        const filesInfo = await getAllFilesInfo(FILES_DIR_PATH);
        res.status(200).json(filesInfo);
    } catch (error) {
        res.status(500).json({message: error.message});
    }
}

export const deleteFileAndDetails = async (req, res) => {
    try {
        await deleteFile(FILES_DIR_PATH, req.params.filename, req.params.fileId);
        res.status(200).json({message: 'File deleted successfully'});
    } catch (error) {
        res.status(500).json({message: error.message});
    }
}

export const getFilePreview = async (req, res, next) => {
    try {
      const fileName = req.params.filename;
      const filePath = await getFilePath(PREVIEW_FILES_DIR_PATH+'//'+fileName, fileName);
      console.log("FilePath - ",filePath)
      if (!filePath) {
        return res.status(404).send('File not found');
      }
      res.sendFile(filePath);
    } catch (error) {
      next(error);
    }
  };

  export const getFileSample = async (req, res, next) => {
    try {
      const fileName = req.params.filename;
      const sampleFileName = req.params.sample;
      console.log("FileName - ",sampleFileName)
      // const filePath = await getFilePath(SAMPLE_FILES_DIR_PATH+'//'+fileName);
      const filePath = path.join(SAMPLE_FILES_DIR_PATH, fileName, sampleFileName);
      if (!filePath) {
        return res.status(404).send('File not found');
      }
      res.sendFile(filePath);
    } catch (error) {
      next(error);
    }
  };




  // export const getAllFiles = async (req,res) => {
  //   try {
  //     const files = await fetchAllFiles();
  //     res.json(files);
  //   }

  //   catch (error) {
  //     console.error('Error retrieving files:', error);
  //     res.status(500).json({ message: 'Error retrieving files' });
  //   }
  // };

  // export const deleteFile = (req,res) =>{
  //   const {publicId} = req.params;
  //   deleteFileFromCloudinary(publicId)
  //   .then((result) => {
  //     console.log('File deleted successfully from cloudinary:', result);
  //     res.json({ message: 'File deleted successfully' , result});
  //   })
  //   .catch((error) => {
  //     console.error('Error deleting file:', error);
  //     res.status(500).json({ message: 'Error deleting file' });
  //   });
  // }

  // export const getFile = (req,res) =>{
  //   const {publicId} = req.params;
  //   getFileFromCloudinary(publicId)
  //   .then((result) => {
  //     console.log('File retrieved successfully from cloudinary:', result);
  //     res.json(result);
  //   })
  //   .catch((error) => {
  //     console.error('Error retrieving file:', error);
  //     res.status(500).json({ message: 'Error retrieving file' });
  //   });
  //   }
