import mongoose from 'mongoose';

const sampleFileSchema = new mongoose.Schema({
  originalfilename: { type: String, required: true },
  filename: { type: String, required: true },
  dirpath: { type: String, required: true },
  size: { type: String, required: true },
  mimetype: { type: String, required: true },
  updatedAt: { type: Date, default: Date.now }
});

const fileSchema = new mongoose.Schema({
  originalfilename: { type: String, required: true },
  filename: { type: String, required: true },
  dirpath: { type: String, required: true },
  samplefilesdirpath: { type: String, required: true },
  size: { type: String, required: true },
  mimetype: { type: String, required: true },
  price: { type: Number, required: true, min: 0 },
  description: { type: String, required: true },
  isDeleted: { type: Boolean, required: true, default: false },
  sampleFiles: { type: [sampleFileSchema], required: true, default: [] },
  updatedAt: { type: Date, default: Date.now }
});

const File = mongoose.model('File', fileSchema);

export default File;
