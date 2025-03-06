export default {
    db: {
        url: process.env.PROD_DB_URL || 'mongodb://localhost:27017/prod-db',
    },
    port: process.env.PORT || 8000,
    logging: {
        level: 'warn',
    },
};
