import createTransport from './emailTransport.js';
import emailTemplates from './emailTemplates.js';
import logger from '../../utils/logger.js';
import configs from '../../config/index.js';

class EmailService {
  constructor(user, url) {
    this.to = user.email;
    this.url = url;
    this.from = configs.email.emailFrom;
  }

  async send(subject, templateName,binddata) {
    const transport = await createTransport();
    const template = await emailTemplates.getTemplate(templateName,binddata);

    const mailOptions = {
      from: this.from,
      to: this.to,
      subject,
      html: template
    };

    try {
      const info = await transport.sendMail(mailOptions);
      logger.info(`Email sent: ${info.response}`);
    } catch (error) {
      logger.error('Error sending email:', error);
      throw new Error('There was an error sending the email');
    }
  }


  async sendWelcome(obj) {
    obj = {
      name: "User",
      url: "drive.com"
    };
    await this.send('Thanks for downloading!', 'thankyouTemplate',obj);
  }

  async sendOTP(obj) {
    await this.send('OTP for email verification', 'otpTemplate',obj);
  }

  async sendContactThanks(){
    await this.send('Thanks for reaching me out!', 'contactMeThanks',{});
  }
}

export default EmailService;
