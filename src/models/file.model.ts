import mongoose from 'mongoose';
import configs from '../config/index';
import { FileInfo, StorageType } from '../interfaces/file.interface';

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

const s3Schema = new mongoose.Schema({
  fileId: { type: String, required: true, unique: true, sparse: true },
  bucket: { type: String, required: true },
  key: { type: String, required: true },
  samplePrefix: { type: String, required: true },
  previewPrefix: { type: String, required: true },
});

const localSchema = new mongoose.Schema({
  dirpath: { type: String, required: true },
  sampleDirpath: { type: String, required: true },
  previewDirpath: { type: String, required: true },
});

const fileSchema = new mongoose.Schema({
  originalFilename: { type: String, required: true },
  filename: { type: String, required: true },
  size: { type: String, required: true },
  mimetype: { type: String, required: true },
  price: { type: Number, required: true, min: 0 },
  description: { type: String, default: '' },
  previewUrl: { type: String, default: '' },
  isDeleted: { type: Boolean, required: true, default: false },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
  
  // Storage-specific fields
  googleDrive: {
    type: gdriveSchema,
    required: function() {
      return configs.storage.type === StorageType.GOOGLE_DRIVE;
    }
  },
  cloudinary: {
    type: cloudinarySchema,
    required: function() {
      return configs.storage.type === StorageType.CLOUDINARY;
    }
  },
  s3: {
    type: s3Schema,
    required: function() {
      return configs.storage.type === StorageType.S3;
    }
  },
  local: {
    type: localSchema,
    required: function() {
      return configs.storage.type === StorageType.LOCAL;
    }
  }
});

fileSchema.pre('save', function(next) {
  this.updatedAt = new Date();
  next();
});

fileSchema.pre('findOneAndUpdate', function(next) {
  this.set({ updatedAt: new Date() });
  next();
});

const File = mongoose.model<FileInfo & mongoose.Document>('File', fileSchema);

export default File;
