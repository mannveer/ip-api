import createTransport from './email-transport';
import emailTemplates from './mail-template-handler';
import logger from '../../utils/logger';
import configs from '../../config/index';
import { IEmailOptions } from '../../interfaces/email.interface';

class EmailService {
  private to: string;
  private url?: string;
  private from: string;

  constructor(user?: any, url?: string) {
    this.to = user?.email || '';
    this.url = url;
    this.from = configs.email.emailFrom;
  }

  /**
   * Send an email with the provided template and data
   */
  async send(subject: string, templateName: string, binddata: any): Promise<void> {
    // Skip actual sending if in test mode
    if (process.env.NODE_ENV === 'test') {
      logger.info(`[TEST MODE] Would send email: ${templateName} to ${this.to}`);
      return;
    }

    // Get template first to avoid creating transport if template fails
    const template = await emailTemplates.getTemplate(templateName, binddata);
    const transport = await createTransport();

    const mailOptions: IEmailOptions = {
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

  /**
   * Send welcome email
   */
  async sendWelcome(data?: any): Promise<void> {
    const obj = {
      name: data?.name || "User",
      url: data?.url || "drive.com"
    };
    await this.send('Thanks for downloading!', 'thankyouTemplate', obj);
  }

  /**
   * Send OTP email
   */
  async sendOTP(obj: any): Promise<void> {
    await this.send('OTP for email verification', 'otpTemplate', obj);
  }

  /**
   * Send contact thank you email
   */
  async sendContactThanks(): Promise<void> {
    await this.send('Thanks for reaching out to me!', 'contactMeThanks', {});
  }
}

export default EmailService;
