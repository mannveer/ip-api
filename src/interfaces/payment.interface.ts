import { IUser } from './user.interface';
import { Types } from 'mongoose';

export interface IPurchase {
  user_id: Types.ObjectId;
  order_id: string;
  entity: 'file' | 'subscription' | 'payment';
  amount: number;
  currency: 'INR' | 'USD' | 'EUR';
  status: 'pending' | 'success' | 'failed' | 'captured';
  invoice_id?: string | null;
  international: boolean;
  method: string;
  amount_refunded?: number;
  refund_status?: string | null;
  captured: boolean;
  description: string;
  card_id?: string | null;
  bank?: string | null;
  wallet: string;
  vpa?: string | null;
  email: string;
  contact: string;
  notes: {
    email: string;
    fileId: Types.ObjectId;
  };
  fee?: number;
  tax?: number;
  error_code?: string | null;
  error_description?: string | null;
  error_source?: string | null;
  error_step?: string | null;
  error_reason?: string | null;
  acquirer_data?: {
    transaction_id?: string | null;
  };
  created_at: Date;
  updated_at: Date;
}

export interface IPaymentService {
  isPaymentSuccess1(orderId: string, paymentId: string, email: string, fileId: string, user: IUser): Promise<{ payment: any, alreadyProcessed: boolean }>;
  fetchPaymentDB1(userId: string, fileId: string): Promise<any[]>;
  insertPaymentDB(userId: string, payment: any): Promise<void>;
}
