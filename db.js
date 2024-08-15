
import mongoose from 'mongoose';
import Grid from 'gridfs-stream';
import { configs } from './src/config/config.js';

mongoose.connect(configs.dbconfig.url)
.then(()=>console.log('Connection to database has been established successfully'))

const db = mongoose.connection;
let gfs;
db.once('open', () => {
  gfs = Grid(db.db, mongoose.mongo);
  gfs.collection('file-uploads');
});

db.on('error', console.error.bind(console, 'connection error:'));

db.on('data', () => console.log('Data received from Database'));

db.on('disconnected', () => console.log('Disconnected from Database'));

export {db,gfs};