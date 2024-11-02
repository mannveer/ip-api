import app from './app.js';
import configs from './config/index.js';
import { connectDB } from '../db/index.js';
// console.log("configs - ",configs)
connectDB(configs.db.url);

app.listen(configs.port, (err) => {
    if (err) {
        console.error('Error starting the server');
        process.exit(1);
    }
    console.log(`${configs.appName} is running on port ${configs.port}`);
});
