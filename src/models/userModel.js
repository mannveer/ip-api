import mongoose from 'mongoose';

const { Schema } = mongoose;

const PurchaseSchema = new Schema({
  filename: String,
  purchase: {
    fileid: String,
    entity: String,
    amount: Number,
    currency: String,
    status: String,
    paymentid: String,
    created_at: Number
  }
});

const UserSchema = new Schema({
  name: {
    type: String,
    required: [true, 'Please enter your name'],
    trim: true,
    maxLength: [50, 'Name cannot exceed 50 characters']
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
  },
  accessToken: {
    type: String
  }
});

const User = mongoose.model('User', UserSchema);

export default User;
