// src/interfaces/user.interface.ts

import { IPurchase } from "./payment.interface";

export interface IUser {
  name: string;
  email: string;
  role: 'user' | 'admin' | 'provider';
  accessToken?: string;
  createdAt: Date;
  updatedAt: Date;
  purchases?: IPurchase[];
}
  
  export interface IContactRequest {
    email: string;
    name: string;
    message: string;
  }
  
  export interface IUserRequest {
    email: string;
    name?: string;
    purchase?: IPurchase;
  }
  
  export interface IFileInfo {
    googleDrive: {
      fileId: string;
      [key: string]: any;
    };
    [key: string]: any;
  }

  import { Request, Response, NextFunction } from 'express';

export interface IUserController {
  insertUser(req: Request, res: Response, next: NextFunction): Promise<void>;
  getUserDetails(req: Request, res: Response, next: NextFunction): Promise<void>;
  emailFile(req: Request, res: Response, next: NextFunction): Promise<void>;
  sendContactEmail(req: Request, res: Response, next: NextFunction): Promise<void>;
}
  

  export interface IUserService {
    insertData(userData: IUserRequest): Promise<{ user: IUser }>;
    getDetails(userData: { email: string, fileid: string }): Promise<{ user: IUser, filePurchase: boolean } | null>;
    getDetailsById(id: string): Promise<IUser | null>;
    getDetailsByEmail(email: string): Promise<IUser | null>;
    saveContactUser(userData: IContactRequest): Promise<any>;
  }