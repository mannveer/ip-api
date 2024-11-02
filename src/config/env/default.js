export default {
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
    }
};
