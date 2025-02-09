import mongoose from 'mongoose';
const { Schema } = mongoose;

const PurchaseSchema = new Schema(
  {
    user_id: {
        type: Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        index: true, 
      },
    order_id: {
      type: String,
      required: [true, 'Order ID is required'],
      unique: true, 
      trim: true,   
      index: true,
    },
    entity: {
      type: String,
      required: [true, 'Entity is required'],
      enum: {
        values: ['file', 'subscription', 'payment'],
        message: 'Entity must be either file, subscription, or payment'
      }
    },
    amount: {
      type: Number,
      required: [true, 'Amount is required'],
      min: [0, 'Amount must be a positive number'],
      validate: {
        validator: (v) => v > 0,
        message: 'Amount must be greater than zero'
      }
    },
    currency: {
      type: String,
      required: [true, 'Currency is required'],
      enum: {
        values: ['INR', 'USD', 'EUR'],
        message: 'Currency must be INR, USD, or EUR'
      }
    },
    status: {
      type: String,
      required: [true, 'Payment status is required'],
      enum: {
        values: ['pending', 'success', 'failed', 'captured'],
        message: 'Status must be one of pending, success, failed, or captured'
      }
    },
    invoice_id: {
      type: String,
      default: null,
    },
    international: {
      type: Boolean,
      required: [true, 'International status is required'],
    },
    method: {
      type: String,
      required: [true, 'Payment method is required'],
      trim: true,
    },
    amount_refunded: {
      type: Number,
      default: 0,
      min: [0, 'Refunded amount must be at least zero'],
    },
    refund_status: {
      type: String,
      default: null,
    },
    captured: {
      type: Boolean,
      required: [true, 'Captured status is required'],
    },
    description: {
      type: String,
      required: [true, 'Description is required'],
      trim: true,
    },
    card_id: {
      type: String,
      default: null,
    },
    bank: {
      type: String,
      default: null,
    },
    wallet: {
      type: String,
      required: [true, 'Wallet type is required'],
      trim: true,
    },
    vpa: {
      type: String,
      default: null,
    },
    email: {
      type: String,
      required: [true, 'Email is required'],
      lowercase: true,  
      match: [/\S+@\S+\.\S+/, 'Please enter a valid email address'], 
    },
    contact: {
      type: String,
      required: [true, 'Contact number is required'],
      validate: {
        validator: (v) => /^(\+?\d{1,4}[\s-]?)?(\(?\d{1,3}\)?[\s-]?)?[\d\s-]{7,15}$/.test(v),
        message: 'Please enter a valid contact number'
      },
    },
    notes: {
      email: {
        type: String,
        required: [true, 'Email in notes is required'],
        lowercase: true,
        match: [/\S+@\S+\.\S+/, 'Please enter a valid email address'],
      },
      fileId: {
        type: Schema.Types.ObjectId,
        ref: 'File',
        required: [true, 'File ID in notes is required'],
      }
    },
    fee: {
      type: Number,
      default: 0,
      min: [0, 'Fee must be a positive number']
    },
    tax: {
      type: Number,
      default: 0,
      min: [0, 'Tax must be a positive number']
    },
    error_code: {
      type: String,
      default: null,
    },
    error_description: {
      type: String,
      default: null,
    },
    error_source: {
      type: String,
      default: null,
    },
    error_step: {
      type: String,
      default: null,
    },
    error_reason: {
      type: String,
      default: null,
    },
    acquirer_data: {
      transaction_id: {
        type: String,
        default: null,
      }
    },
    created_at: {
      type: Date,
      default: () => new Date(1738962037 * 1000),
      required: true
    },
    updated_at: {
      type: Date,
      default: Date.now,
    }
  },
  {
    timestamps: true,  
    // _id: false
  }
);

PurchaseSchema.index({ user_id: 1 });
PurchaseSchema.index({ 'notes.fileId': 1 });
PurchaseSchema.index({ createdAt: -1 });



PurchaseSchema.pre('save', function (next) {
  this.updated_at = Date.now();
  next();
});

const Purchase = mongoose.model('Purchase', PurchaseSchema);

export default Purchase;