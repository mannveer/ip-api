import mongoose from 'mongoose';
// import { type } from 'os';
import configs from '../config/index.js';

const gdriveSchema = new mongoose.Schema({
  fileId: { type: String, required: true, unique: true, sparse: true },
  sampleFolderId: { type: String, required: true },
  previewFolderId: { type: String, required: true },
});

const cloudinarySchema = new mongoose.Schema({
  fileId: { type: String, required: true, unique: true, sparse: true },
  previewFolderPath: { type: String, required: true },
  sampleFolderPath: { type: String, required: true },
});

const fileSchema = new mongoose.Schema({
  originalfilename: { type: String, required: true },
  filename: { type: String, required: true },
  dirpath: {
    type: String,
    default: 'NA',
    validate: {
      validator: function (value) {
        return configs.multer.storage !== 'local' || value !== 'NA';
      },
      message: 'dirpath is required for local configuration.',
    },
  },
  googleDrive: {
    type: gdriveSchema,
    validate: {
      validator: function (value) {
        return configs.multer.storage !== 'drive' || !!value;
      },
      message: 'Google Drive details are required for drive configuration.',
    },
  },
  size: { type: String, required: true },
  mimetype: { type: String, required: true },
  price: { type: Number, required: true, min: 0 },
  description: { type: String, default: '' },
  isDeleted: { type: Boolean, required: true, default: false },
  updatedAt: { type: Date, default: Date.now },
  cloudinary: {
    type: cloudinarySchema,
    validate: {
      validator: function (value) {
        return configs.multer.storage !== 'cloudinary' || !!value;
      },
      message: 'Cloudinary details are required for cloudinary configuration.',
    },
  },
});

// fileSchema.pre('save', function (next) {
//   if (configs.multer.storage === 'drive' && !this.googleDrive?.fileId) {
//     return next(new AppError('googleDrive.fileId is required when storage is set to drive.'));
//   }
//   else if (configs.multer.storage === 'cloudinary' && !this.cloudinary?.fileId) {
//     return next(new AppError('cloudinary.fileId is required when storage is set to cloudinary.'));
//   }
//   next();
// });

const File = mongoose.model('File', fileSchema);

export default File;
