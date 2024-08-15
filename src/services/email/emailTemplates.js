import ejs from 'ejs';
import path from 'path';
import { fileURLToPath } from 'url';

class EmailTemplates {
    async getTemplate(templateName,data) {
      // Fetch the template from a secure storage location (e.g., Azure Blob Storage, AWS S3)
      // For demonstration, returning a simple placeholder template
      // return `<html><body><h1>${templateName}</h1></body></html>`;
      const __dirname = path.dirname(fileURLToPath(import.meta.url));
      const templatePath = path.join(__dirname, '../../views', `${templateName}.html`);
      return await ejs.renderFile(templatePath, data);
    
    }
  }
  
  export default new EmailTemplates();
  