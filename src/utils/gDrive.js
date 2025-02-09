import fs from 'fs';
import { google } from 'googleapis';
import configs from '../config/index.js';
import { Readable } from 'stream';

class AuthService {
  constructor() {
    this.auth = null;
  }

  initialize() {
    const credentials = JSON.parse(configs.google.drive);
    this.auth = new google.auth.GoogleAuth({
      credentials,
      scopes: ['https://www.googleapis.com/auth/drive'],
    });
  }

  getAuthClient() {
    return this.auth.getClient();
  }
}

class DriveService {
    constructor() {
      this.drive = null;
    }
  
    async initialize() {
      const authService = new AuthService('cred-mann.json'); 
      await authService.initialize();
      const authClient = await authService.getAuthClient();  
      this.drive = google.drive({ version: 'v3', auth: authClient });
    }
  

    async uploadFile(fileBuffer, fileName, folderId = null, mimeType='application/octet-stream') {
      const fileMetadata = {
      name: fileName,
      parents: folderId ? [folderId] : [],
      };
      const stream = new Readable();
      stream.push(fileBuffer);
      stream.push(null); // end of the stream

      const media = {
        mimeType,
        // body: file, 
        body: stream, 
      };
    
      try {
      const uploadedFile = await this.drive.files.create({
        requestBody: fileMetadata,
        media: media,
        fields: 'id',
      });
      return uploadedFile.data.id;
      } catch (error) {
      console.error('Error uploading file:', error);
      throw error;
      }
    }
    
  
    async downloadFile(fileId, destinationPath) {
      const dest = fs.createWriteStream(destinationPath);
  
      const response = await this.drive.files.get({
        fileId,
        alt: 'media',
      }, { responseType: 'stream' });
  
      return new Promise((resolve, reject) => {
        response.data
          .on('end', () => resolve('File downloaded.'))
          .on('error', (error) => reject(`Error downloading file: ${error}`))
          .pipe(dest);
      });
    }
  
    async listFiles(folderId = null) {
      const query = folderId ? `'${folderId}' in parents and trashed = false` : "'root' in parents";
      const response = await this.drive.files.list({
      q: query,
      fields: 'files(id, name, mimeType)',
      });
    
      return response.data.files.map(file => ({
      id: file.id,
      name: file.name,
      mimeType: file.mimeType,
      }));
    }

    async getFileStream(fileId) {
      const response = await this.drive.files.get(
        { fileId, alt: 'media' },
        { responseType: 'stream' }
      );
    
      const fileMetadata = await this.drive.files.get({ fileId, fields: 'mimeType' });
    
      return { data: response.data, mimeType: fileMetadata.data.mimeType };
    };
    
    async shareFile(fileId, email, role = 'reader') {
      await this.drive.permissions.create({
        fileId,
        requestBody: {
          role,
          type: 'user',
          emailAddress: email,
        },
      });
  
      console.log(`File shared with ${email} as ${role}.`);
    }
  
    async shareFile1(fileId, email, role = 'reader') {
      await this.drive.permissions.create({
      fileId,
      requestBody: {
        role,
        type: 'user',
        emailAddress: email,
      },
      sendNotificationEmail: false,
      });
    
      console.log(`File shared with ${email} as ${role}.`);
    }
  
    async createFolder(folderName, parentFolderId = null) {
      const fileMetadata = {
        name: folderName,
        mimeType: 'application/vnd.google-apps.folder',
        ...(parentFolderId && { parents: [parentFolderId] }),
      };
  
      const response = await this.drive.files.create({
        requestBody: fileMetadata,
        fields: 'id',
      });
  
      return response.data.id;
    }

    async deleteFile(fileId) {
      await this.drive.files.delete({ fileId });
      console.log(`File with ID ${fileId} deleted.`);
    }
  }
  

  const initializeServices = async () => {
    const driveService = new DriveService();
    await driveService.initialize();
    return driveService;
  };

  export const driveServiceInstance = await initializeServices();
