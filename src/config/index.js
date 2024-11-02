import dotenv from 'dotenv';
// import defaultConfig from './env/default.js';

// dotenv.config(); // Loads environment variables from `.env` file

// const env = process.env.NODE_ENV || 'development';
// const envConfig = await import(`./env/${env}.js`).then((module) => module.default);


const envFile = `.env.${process.env.NODE_ENV || 'development'}`;
dotenv.config({ path: envFile });

const configs = {
    // ...defaultConfig,
    // ...envConfig,
    appName: 'ip',
    jwtSecret: process.env.JWT_SECRET || 'ip-default-ip-key',
    metrics: {
        enabled: process.env.METRICS_ENABLED === 'true',
    },
    cloudindary:{
        cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
        api_key: process.env.CLOUDINARY_API_KEY,
        api_secret: process.env.CLOUDINARY_API_SECRET
    },
    jwt: {
        jwtSecret : process.env.JWT_SECRET || 'your_jwt_secret',
        jwtExpiresIn : process.env.JWT_EXPIRE || '10m',
        bcryptSaltRounds : process.env.SALT_ROUNDS || 12,   
        jwtRefreshSecret : process.env.JWT_REFRESH_SECRET || '',
        jwtRefreshExpiresIn : process.env.JWT_REFRESH_EXPIRE || '7d'     
    },
    db: {
        url: process.env.DB_URL || 'mongodb://localhost:27017/priyanka',
        host: process.env.DB_HOST || 'localhost',
        user: process.env.DB_USER || 'root',
        password: process.env.DB_PASS || '',
        database: process.env.DB_NAME || 'test'
    },
    port: process.env.PORT || 3000,
    logging: {
        level: 'debug',
    },
    email:{
        emailFrom : process.env.EMAIL_FROM || 'no-reply@example.com',
        emailHost : process.env.EMAIL_HOST || 'smtp.example.com',
        emailPort : process.env.EMAIL_PORT || 587,
        emailUsername : process.env.EMAIL_USERNAME || 'username',
        emailPassword : process.env.EMAIL_PASSWORD || 'password',
        emailMaxRetries: process.env.MAX_RETRIES_EMAIL || 3,
        emailRetryDelay: process.env.EMAIL_RETRY_DELAY || 2000
    },
    otp:{
        OtpLength : process.env.OTP_LENGTH || 6,
        OtpExpTime : process.env.OTP_EXPIRE || 300000,
        OtpMaxAttempts : process.env.OTP_ATTEMPT_LIMIT || 5,
        OtpAttemptLimitTime : process.env.OTP_ATTEMPT_LIMIT_TIME || 15000,
        otpResendTime  : process.env.OTP_RESEND_TIME || 60000,
        otpGenerateDelay  : process.env.OTP_GENERATE_DELAY || 20000        
    },
    razorpay:{
        key_id : process.env.RAZORPAY_KEY_ID,
        key_secret : process.env.RAZORPAY_KEY_SECRET
    },
    redis:{
        host : process.env.REDIS_HOST || 'localhost',
        port : process.env.REDIS_PORT || 6379,
        password : process.env.REDIS_PASSWORD || ''
    },
    aws:{
        accessKeyId : process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey : process.env.AWS_SECRET_ACCESS_KEY,
        region : process.env.AWS_REGION,
        bucketName : process.env.AWS_BUCKET_NAME
    },
    google:{
        clientId : process.env.GOOGLE_CLIENT_ID,
        clientSecret : process.env.GOOGLE_CLIENT_SECRET,
        redirectUri : process.env.GOOGLE_REDIRECT_URI
    }
};

export default configs;
