import multer from "multer";
import configs from "../config/index.js";

import path from 'path';

import { fileURLToPath } from 'url';
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);


const storage1 = multer.diskStorage({
    destination: function (req, file, cb) {
        // const dirPath = req.body.dirpath;
        const fullPath = "./DeliveryFiles/files";
        if (!fullPath) {
            return cb(new Error('No directory path specified'), null);
        }        
        cb(null, fullPath);
    },

    filename: function (req, file, cb) {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, uniqueSuffix + '-' + file.originalname);
    }
});

const storage2 = multer.memoryStorage({
    filename: function (req, file, cb) {
        console.log("file ---- ", file);
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, uniqueSuffix + '-' + file.originalname);
    }
});



export const upload = multer({ storage: configs.multer.storage === 'local' ? storage1:storage2 });
