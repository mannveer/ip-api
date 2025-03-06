import { Response } from 'nodemailer';

export interface IEmailOptions {
  from: string;
  to: string;
  subject: string;
  html: string;
  text?: string;
  attachments?: Array<{
    filename: string;
    content: Buffer | string;
    contentType?: string;
  }>;
}

export interface IEmailService {
  send(subject: string, templateName: string, binddata: any): Promise<void>;
  sendWelcome(obj?: any): Promise<void>;
  sendOTP(obj: any): Promise<void>;
  sendContactThanks(): Promise<void>;
}

export interface IEmailTemplateService {
  getTemplate(templateName: string, data: any): Promise<string>;
}

export interface IEmailTransport {
  createTransport(): Promise<any>;
}

export interface IEmailQueueJob {
  type: string;
  data: {
    user: any;
    url?: string;
    [key: string]: any;
  };
}

export interface IEmailQueueService {
  add(type: string, data: any): void;
}

export interface IEmailResponse extends Response {
  messageId: string;
  response: string;
}
