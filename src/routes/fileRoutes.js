import express from 'express';
import {getFile, uploadFile, deleteFileAndDetails, getAllFilesDetails, getFileDetails, getFilePreview} from '../controllers/fileController.js';
import {upload} from '../middleware/multer.middleware.js';
import bodyParser from 'body-parser';

const router = express.Router();
// router.use(bodyParser.json());
// router.use(bodyParser.urlencoded({ extended: true }));

router.get('/details/:fileId', getFileDetails);
router.get('/details', getAllFilesDetails);
router.post('/upload', upload.single('file'), uploadFile);
router.delete('/:fileId/:filename', deleteFileAndDetails);
router.get('/dir/:filename/:type', getFile);
router.get('/file-preview/:filename',getFilePreview)

export default router;