import nodemailer from 'nodemailer';
import configs from '../../config/index.js';

const createTransport = async () => {
    return nodemailer.createTransport({
      host: configs.email.emailHost,
      port: configs.email.emailPort,
      // secure: true, // Use TLS
      secure: false, // Use TLS
      auth: {
        user: configs.email.emailUsername,
        pass: configs.email.emailPassword
      }
    });
};

export default createTransport;
