import mongoose from 'mongoose';

const { Schema } = mongoose;

const PurchaseSchema = new Schema({
  filename: String,
  purchase: {
    id: String,
    entity: String,
    amount: Number,
    currency: String,
    status: String,
    receipt: String,
    offer_id: String,
    attempts: Number,
    notes: Array,
    created_at: Number
  }
});

const UserSchema = new Schema({
  name: {
    type: String,
    required: [true, 'Please enter your first name'],
    trim: true,
    maxLength: [50, 'First name cannot exceed 50 characters']
  },
  email: {
    type: String,
    required: [true, 'Please enter your email'],
    unique: true,
    validate: {
      validator: function (v) {
        return /\S+@\S+\.\S+/.test(v);
      },
      message: 'Please enter a valid email'
    }
  },
  role: {
    type: String,
    enum: ['user', 'admin', 'provider'],
    default: 'user'
  },
  purchases: {
    type: [PurchaseSchema],
    default: []
  },
  createdAt: {
    type: Date,
    default: Date.now,
    required: true
  },
  updatedAt: {
    type: Date,
    default: Date.now,
    required: true
  }
});

const User = mongoose.model('User', UserSchema);

export default User;
