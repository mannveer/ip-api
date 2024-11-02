import {getFilePath, getFile1,getFileInfo,getAllFilesInfo,deleteFile, insertFileInfo, createDirectory, getFilePaths } from '../services/fileService.js';
import path from 'path';

const DELIVERY_FILES_DIR = path.join(process.cwd(), 'DeliveryFiles');
const FILES_DIR_PATH = path.join(DELIVERY_FILES_DIR, 'files');
const SAMPLE_FILES_DIR_PATH = path.join(DELIVERY_FILES_DIR, 'sample-files');
const PREVIEW_FILES_DIR_PATH = path.join(DELIVERY_FILES_DIR, 'preview-files');

export const uploadFile = async (req, res) => {
    try {

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
            // sampleFiles: file.sampleFiles ?? [],
            // samplefilesdirpath: SAMPLE_FILES_DIR_PATH + file.filename
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
        const filePaths = await getFilePaths(path.join(SAMPLE_FILES_DIR_PATH, fileName));
            if (!filePaths || filePaths.length === 0) {
                return res.status(404).send('File not found');
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
    const baseDir = req.params.type === 'sample' ? SAMPLE_FILES_DIR_PATH : FILES_DIR_PATH;
    const fileName = req.params.type === 'sample' ? `${req.params.filename}.zip` : req.params.filename;
    await getFile1(baseDir, fileName, res);
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
      console.log("FILES_DIR_PATH - ",FILES_DIR_PATH)
        const filesInfo = await getAllFilesInfo(FILES_DIR_PATH);
        res.status(200).json(filesInfo);
    } catch (error) {
        if(error.statusCode)
        res.status(error.statusCode).json({message: error.message});
        else
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
