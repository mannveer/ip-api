import ejs from 'ejs';
import path from 'path';
import fs from 'fs';
import logger from '../../utils/logger';
import { IEmailTemplateService } from '../../interfaces/email.interface';

// Cache for templates to improve performance
const templateCache: Record<string, string> = {};

class EmailTemplates implements IEmailTemplateService {
  /**
   * Get and render an email template
   */
  async getTemplate(templateName: string, data: any): Promise<string> {
    try {
      const templatePath = path.join(process.cwd(), './src/views', `${templateName}.html`);
      
      // Check if template is in cache
      if (!templateCache[templateName]) {
        // Read template file if not in cache
        const templateContent = await fs.promises.readFile(templatePath, 'utf8');
        templateCache[templateName] = templateContent;
      }
      
      // Render template with data
      return ejs.render(templateCache[templateName], data);
    } catch (error) {
      logger.error(`Error getting template ${templateName}:`, error);
      // Return a simple fallback template
      return this.getFallbackTemplate(templateName, data);
    }
  }
  
  /**
   * Get a fallback template in case the main template fails
   */
  private getFallbackTemplate(templateName: string, data: any): string {
    switch (templateName) {
      case 'thankyouTemplate':
        return `<html><body><h1>Thank you for downloading!</h1><p>Hello ${data?.name || 'User'},</p><p>Thank you for your download.</p></body></html>`;
      case 'otpTemplate':
        return `<html><body><h1>Your OTP Code</h1><p>Your verification code is: ${data?.otp || '[OTP NOT AVAILABLE]'}</p></body></html>`;
      case 'contactMeThanks':
        return `<html><body><h1>Thank You for Contacting Us</h1><p>We have received your message and will get back to you soon.</p></body></html>`;
      default:
        return `<html><body><h1>${templateName}</h1><p>Email content unavailable.</p></body></html>`;
    }
  }
}

export default new EmailTemplates();
