import express from 'express';
import {getFile, uploadFile, deleteFileAndDetails, getAllFilesDetails, getFileDetails, getFilePreview, getSampleFileByFileName, getFileSample} from '../controllers/fileController.js';
import {upload} from '../middleware/multer.middleware.js';
import bodyParser from 'body-parser';
import { uploadOnCloudinary } from '../utils/cloudinary.js';
// import { cache } from '../middleware/cacheMiddleware.js';

const router = express.Router();
// router.use(bodyParser.json());
// router.use(bodyParser.urlencoded({ extended: true }));
const a = async (req,res)=>{
    try{
        uploadOnCloudinary("C:\\Users\\manveer.a.kumar\\Desktop\\fs-5.zip")
    }
    catch(err){
    
    }
    }
router.get('/details/:fileId', getFileDetails);
router.get('/details', getAllFilesDetails);
router.post('/upload', upload.single('file'), uploadFile);
router.delete('/:fileId/:filename', deleteFileAndDetails);
router.get('/dir/:filename/:type', getFile);
router.get('/file-preview/:filename',getFilePreview)
router.get('/file-sample-url/:filename', getSampleFileByFileName);
router.get('/file-sample/:filename/:sample', getFileSample);


router.post('/acccloudinary', a);





export default router;