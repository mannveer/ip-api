import app from './app';
import configs from './config/index';
import  connectDB  from '../db/index';
// console.log("configs - ",configs)
connectDB(configs.db.url);

app.listen(configs.port, (err?: any) => {
    if (err) {
        console.error('Error starting the server');
        process.exit(1);
    }
    console.log(`${configs.appName} is running on port ${configs.port}`);
});
