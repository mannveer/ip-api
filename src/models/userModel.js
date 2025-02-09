import mongoose from 'mongoose';
const { Schema } = mongoose;

const UserSchema = new Schema(
  {
    name: {
      type: String,
      trim: true,
      maxlength: [50, 'Name cannot exceed 50 characters']
    },
    email: {
      type: String,
      required: [true, 'Please enter your email'],
      unique: true,
      index: true,
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
    accessToken: {
      type: String,
      select: false
    }
  },
  {
    timestamps: true,
    strict: true,
    toJSON: {
      virtuals: true,
      transform: function (doc, ret) {
        // Remove fields that should not be sent to the client
        delete ret.__v;
        delete ret.accessToken;
        return ret;
      }
    },
    toObject: {
      virtuals: true,
      transform: function (doc, ret) {
        delete ret.__v;
        delete ret.accessToken;
        return ret;
      }
    }
  }
);

UserSchema.virtual('purchases', {
  ref: 'Purchase',
  localField: '_id',
  foreignField: 'user_id',
});


UserSchema.index({ 'purchases.paymentid': 1 });

const User = mongoose.model('User', UserSchema);

export default User;
