import express from 'express';
import {getFile, uploadFile, deleteFileAndDetails, getAllFilesDetails, getFileDetails, getFilePreview, getSampleFileByFileName, getFileSample, uploadFilesOnGoogleDrive, test, streamFile, deleteAllFilesAndDetails, uploadFilesOnCloudinary, uploadFilesOnGoogleDriveCloudinary} from '../controllers/fileController.js';
import {upload} from '../middleware/multer.middleware.js';
// import { cache } from '../middleware/cacheMiddleware.js';

const router = express.Router();

router.get('/details/:fileId', getFileDetails);
router.get('/details', getAllFilesDetails);
router.post('/upload/local', upload.single('file'), uploadFile);
router.post('/upload/googledrive', upload.array('files', 10), uploadFilesOnGoogleDrive);
router.post('/upload/cloudinary', upload.array('files', 10), uploadFilesOnCloudinary);
router.post('/upload/google-cloudinary', upload.array('files', 10), uploadFilesOnGoogleDriveCloudinary);
router.delete('/:fileId/:filename', deleteFileAndDetails);
router.get('/dir/:filename/:type', getFile);
router.get('/file-preview/:filename',getFilePreview);
router.get('/file-sample-url/:filename', getSampleFileByFileName);
router.get('/file-sample/:filename/:sample', getFileSample);
router.get('/stream/:fileId', streamFile);
router.delete('/delete', deleteAllFilesAndDetails);

router.get('/test', test )





export default router;