export default {
    db: {
        url: process.env.DEV_DB_URL || 'mongodb://localhost:27017/priyanka',
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
        emailMaxRetries: process.env.DEV_MAX_RETRIES_EMAIL || 3,
        emailRetryDelay: process.env.DEV_EMAIL_RETRY_DELAY || 2000
    },
    otp:{
        OtpLength : process.env.DEV_OTP_LENGTH || 6,
        OtpExpTime : process.env.DEV_OTP_EXPIRE || 300000,
        OtpMaxAttempts : process.env.DEV_OTP_ATTEMPT_LIMIT || 5,
        OtpAttemptLimitTime : process.env.DEV_OTP_ATTEMPT_LIMIT_TIME || 15000,
        otpResendTime  : process.env.DEV_OTP_RESEND_TIME || 60000,
        otpGenerateDelay  : process.env.DEV_OTP_GENERATE_DELAY || 20000        
    }
}
