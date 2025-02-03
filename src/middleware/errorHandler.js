export const handleError = (err, req, res, next) => {
    const { statusCode = 500, message = 'Internal server error', data } = err;
    res.status(statusCode).json({
        status: 'error',
        statusCode,
        message,
        err,
        data
    });
};
