import mongoose from 'mongoose';

const connectDB = (dbUrl, retries = 5, delay = 5000) => {
    mongoose.connect(dbUrl)
        .then(() => {
            console.log('Database connection successful');
        })
        .catch(err => {
            console.error(`Database connection failed: ${err.message}`);
            if (retries > 0) {
                console.log(`Retrying in ${delay / 1000} seconds... (${retries} retries left)`);
                setTimeout(() => connectDB(dbUrl, retries - 1, delay), delay);
            } else {
                console.error('All connection retries exhausted. Exiting...');
                process.exit(1);
            }
        });
};


export { connectDB };
