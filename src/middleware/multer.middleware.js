import multer from "multer";
import path from 'path';
import { fileURLToPath } from 'url';
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);


const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        // const dirPath = req.body.dirpath;
        const dirPath = "files";
        if (!dirPath) {
            return cb(new Error('No directory path specified'), null);
        }

        // const fullPath = path.join(__dirname, '..', '..', 'DeliveryFiles', dirPath);
        const fullPath = './DeliveryFiles/'+dirPath
        
        cb(null, fullPath);
    },

    filename: function (req, file, cb) {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, uniqueSuffix + '-' + file.originalname);
    }
});


export const upload = multer({storage})