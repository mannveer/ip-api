import nodemailer from 'nodemailer';

const createTransport = async () => {
  if (process.env.NODE_ENV === 'production') {
    return nodemailer.createTransport({
      host: process.env.EMAIL_HOST,
      port: process.env.EMAIL_PORT,
      // secure: true, // Use TLS
      secure: false, // Use TLS
      auth: {
        user: process.env.APP_EMAIL_USERNAME,
        pass: process.env.APP_EMAIL_PASSWORD
      }
    });
  } else {
    return nodemailer.createTransport({
      host: process.env.DEV_EMAIL_HOST,
      port: process.env.DEV_EMAIL_PORT,
      secure: false, // Use STARTTLS
      auth: {
        user: process.env.DEV_EMAIL_USERNAME,
        pass: process.env.DEV_EMAIL_PASSWORD
      }
    });
  }
};

export default createTransport;
