
import mongoose from 'mongoose';
import Grid from 'gridfs-stream';
import { configs } from './src/config/config.js';

const connectWithRetry = (retries = 5, delay = 5000) => {
  mongoose.connect(configs.dbconfig.url)
    .then(() => {
      console.log('Connection to database has been established successfully');
    })
    .catch(err => {
      console.error(`Failed to connect to the database: ${err.message}`);
      if (retries === 0) {
        console.error('Exhausted all retries. Exiting...');
        process.exit(1); // Exit the process with a failure code
      } else {
        console.log(`Retrying in ${delay / 1000} seconds... (${retries} retries left)`);
        setTimeout(() => connectWithRetry(retries - 1, delay), delay);
      }
    });
};

connectWithRetry();


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