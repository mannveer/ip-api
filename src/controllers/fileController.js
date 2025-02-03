import { config } from 'dotenv';
import {getFile1,getFileInfo,deleteFile, insertFileInfo, createDirectory, getFilePaths, deleteMultipleDirectories, uploadFilesToGoogleDrive, getGoogleDriveDetailsDb, getFileStreamFromGoogleDrive, getGoogleDriveFilesFromFolder, deleteAllFilesFromGoogleDriveAndDB, getFilesInfo, uploadFilesToCloudinary, getCloudinaryFilesFromFolder, getFileStreamFromCloudinary, uploadFilesToGoogleCloudinary } from '../services/fileService.js';
import path from 'path';
import configs from '../config/index.js';

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
            description: file.description ?? 'temp1',
            price: file.price ?? 0,
            // sampleFiles: file.sampleFiles ?? [],
            // samplefilesdirpath: SAMPLE_FILES_DIR_PATH + file.filename
            };


            const dirPaths = [path.join(SAMPLE_FILES_DIR_PATH, file.filename || ''), path.join(PREVIEW_FILES_DIR_PATH, file.filename || '')];

            try {
              await createDirectory(dirPaths);
              try{
              await insertFileInfo(fileModel);
            } catch (error) {
              const filepath = path.join(FILES_DIR_PATH, file.filename);
              await deleteFile(filepath);
            }
            } catch (error) {
              await deleteMultipleDirectories(dirPaths);
              res.status(500).json({message: error.message});
            }
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

export const uploadFilesOnGoogleDrive = async (req, res) => {
    try {
        const files = req.files;
        console.log("Files - ",files)
        if (!files || files.length === 0) {
          return res.status(400).send({ message: 'No files uploaded' });
        }
        await uploadFilesToGoogleDrive(files);
        res.status(200).send({
          message: 'Files uploaded successfully',
          files: files.map(file => ({
            filename: file.originalname,
          }))
        });
      } catch (error) {
        res.status(500).json({message: error.message});
      }
}

export const uploadFilesOnCloudinary = async (req, res) => {
    try {
        const files = req.files;
        if (!files || files.length === 0) {
          return res.status(400).send({ message: 'No files uploaded' });
        }
        await uploadFilesToCloudinary(files);
        res.status(200).send({
          message: 'Files uploaded successfully',
          files: files.map(file => ({
          filename: file.originalname,
          }))
        });
      } catch (error) {
        res.status(500).json({message: error.message});
      }
}

export const uploadFilesOnGoogleDriveCloudinary = async (req, res) => {
  try {
      const files = req.files;
      if (!files || files.length === 0) {
        return res.status(400).send({ message: 'No files uploaded' });
      }
      await uploadFilesToGoogleCloudinary(files);
      res.status(200).send({
        message: 'Files uploaded successfully',
        files: files.map(file => ({
        filename: file.originalname,
        }))
      });
    } catch (error) {
      res.status(500).json({message: error.message});
    }
}


export const getSampleFileByFileName = async (req, res, next) => {
    try {
        const filename = req.params.filename;
        if(configs.multer.storage === 'local'){
        const filePaths = await getFilePaths(path.join(SAMPLE_FILES_DIR_PATH, filename));
            if (!filePaths || filePaths.length === 0) {
                return res.status(404).send('File not found');
            }
        // res.sendFile(filePaths);
        const fileUrls = filePaths.map(filePath => {
            return `${req.protocol}://${req.get('host')}/api/v1/file/file-sample/${filename}/${path.basename(filePath)}`;
          });
        res.json({
            status: 'success',
            message: 'Files retrieved successfully',
            data: fileUrls,
          });
        }
        else if(configs.multer.storage === 'cloudinary'){
            const filelist = await getCloudinaryFilesFromFolder(configs.cloudindarydrive.sampleFolderName+'/'+filename);
            if (!filelist || filelist.length === 0) {
              return res.status(404).send('No sample file found');
            }
            const fileUrls = filelist.map(file => {
              return file.secure_url;
            });
            res.json({
              status: 'success',
              message: 'Files retrieved successfully',
              data: fileUrls,
            });
        }
        else{
            const fileData = await getGoogleDriveDetailsDb(filename);
            const fileslist = await getGoogleDriveFilesFromFolder(fileData.sampleFolderId);
            if (!fileslist || fileslist.length === 0) {
              return res.status(404).send('No sample file found');
            }
            const fileUrls = fileslist.map(file => {
              return `${req.protocol}://${req.get('host')}/api/v1/file/stream/${file.id}`;
            });

            res.json({
              status: 'success',
              message: 'Files retrieved successfully',
              data: fileUrls,
            });  
        }

      } catch (error) {
        next(error);
      }
}

export const getFile = async (req, res) => {
  try {
    if(configs.multer.storage === 'local'){
    const baseDir = req.params.type === 'sample' ? SAMPLE_FILES_DIR_PATH : FILES_DIR_PATH;
    const fileName = req.params.type === 'sample' ? `${req.params.filename}.zip` : req.params.filename;
    await getFile1(baseDir, fileName, res);
    }
    else{
        const fileId = req.params.fileId;
        const fileData = await getGoogleDriveDetailsDb(fileId);
      const file = await getFileStreamFromGoogleDrive(fileData.fileId);
        if (!file) {
            return res.status(404).send('File not found');
          }
            res.setHeader('Content-Disposition', `attachment; filename="${file.name}"`);
            res.setHeader('Content-Type', file.mimeType);
            res.send(file.data);
    }
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
        const filesInfo = await getFilesInfo(FILES_DIR_PATH);

        if (!filesInfo || filesInfo.length === 0) {
            return res.status(404).send('Files not found');
        }
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
      if(configs.multer.storage === 'local'){
        const filePaths = await getFilePaths(path.join(PREVIEW_FILES_DIR_PATH, fileName));
        if (!filePaths || filePaths.length === 0) {
          return res.status(404).send('File not found');
        }
  
        res.sendFile(filePaths[0]);
      }
      else if(configs.multer.storage === 'cloudinary'){
        const filelist = await getCloudinaryFilesFromFolder(configs.cloudindarydrive.previewFolderName+'/'+fileName);
        
        if (!filelist || filelist.length === 0) {
          return res.status(404).send('No preview file found');
        }

        

        const file = await getFileStreamFromCloudinary(filelist[0].secure_url);
        if (!file) {
          return res.status(404).send('File not found');
        }

        // const fileExtension = file.split('.').pop().toLowerCase();
        // const mimeType = mime.lookup(fileExtension);
    
        // if (mimeType) {
        //   res.setHeader('Content-Type', mimeType); // Set the dynamic MIME type
        // } else {
        //   res.setHeader('Content-Type', 'application/octet-stream');
        // }
        res.setHeader('Content-Type', 'image/jpeg'); // Example for an image file
        file.pipe(res);

      }
      
      else {
        const fileData = await getGoogleDriveDetailsDb(fileName);
        const filelist = await getGoogleDriveFilesFromFolder(fileData.previewFolderId);
        if (!filelist || filelist.length === 0) {
          return res.status(404).send('No preview file found');
        }

        const file = await getFileStreamFromGoogleDrive(filelist[0].id);

        if (!file) {
          return res.status(404).send('File not found');
        }
        res.setHeader('Content-Type', file.mimeType);
        file.data.pipe(res);
      }

    } catch (error) {
      next(error);
    }
  };

  export const getFileSample = async (req, res, next) => {
    try {
      const fileName = req.params.filename;
      const sampleFileName = req.params.sample;
      console.log("FileName - ",sampleFileName)
      const filePath = path.join(SAMPLE_FILES_DIR_PATH, fileName, sampleFileName);
      if (!filePath) {
        return res.status(404).send('File not found');
      }
      res.sendFile(filePath);
    } catch (error) {
      next(error);
    }
  };

  export const streamFile = async (req, res) => {
    try {
      const fileId = req.params.fileId;
      if(!fileId){
        return res.status(400).send({message: 'FileId is required'});
      }
      const file = await getFileStreamFromGoogleDrive(fileId);
        if (!file) {
          return res.status(404).send('File not found');
        }
        res.setHeader('Content-Type', file.mimeType);
        file.data.pipe(res);

    } catch (error) {
      res.status(500).json({ success: false, message: error.message });
    }
  };
  

  export const test = async (req, res) => {
    try {
        await getGoogleDriveFilesFromFolder('10EJHhyf6ZmH2bFE9Yx9fUOELUbIEx7vz');
        res.status(200).send("done")
    } catch (error) {
        res.status(500).json({message: error.message});
    }
  }

 export const deleteAllFilesAndDetails = async (req, res) => {
    try {
        await deleteAllFilesFromGoogleDriveAndDB();
        res.status(200).send('All files deleted successfully');
    } catch (error) {
        res.status(500).json({message: error.message});
    }
  }