;import dotenv from 'dotenv';
dotenv.config();

export const configs = {
    port: process.env.PORT || 3000,
    dbconfig:{
        url: process.env.DB_URL || 'mongodb://localhost:27017/priyanka',
        host: process.env.DB_HOST || 'localhost',
        user: process.env.DB_USER || 'root',
        password: process.env.DB_PASS || '',
        database: process.env.DB_NAME || 'test'
    },
    cloudindaryConfig:{
        cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
        api_key: process.env.CLOUDINARY_API_KEY,
        api_secret: process.env.CLOUDINARY_API_SECRET
    },
}

export const jwtSecret = process.env.JWT_SECRET || 'your_jwt_secret';
export const jwtExpiresIn = process.env.JWT_EXPIRES_IN || '7d';
export const bcryptSaltRounds = 12;
export const emailFrom = process.env.EMAIL_FROM || 'no-reply@example.com';
export const emailHost = process.env.EMAIL_HOST || 'smtp.example.com';
export const emailPort = process.env.EMAIL_PORT || 587;
export const emailUsername = process.env.EMAIL_USERNAME || 'username';
export const emailPassword = process.env.EMAIL_PASSWORD || 'password';
export const OtpLength = 6;
export const OtpExpTime = 300000;
export const OtpMaxAttempts = 3;
