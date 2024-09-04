import mongoose from 'mongoose';
import {OtpExpTime,OtpLength} from '../config/config.js';


const { Schema } = mongoose;

const otpSchema = new Schema({
    email: {
        type: String,
        required: [true, 'Please enter your email'],
        match: [
            /^[\w-\.]+@([\w-]+\.)+[\w-]{2,4}$/,
            'Please enter a valid email'
        ]
    },
    otp: {
        type: String,
        required: [true, 'Please enter your otp'],
        minLength: [OtpLength, `OTP must be at least ${OtpLength} characters long`],
        select: false
    },
    createdAt: {
        type: Date,
        default: Date.now,
        required: true,
        get : (createdAt) => createdAt.getTime(),
        set : (createdAt) => new Date(createdAt)
    },
    updatedAt: {
        type: Date,
        default: Date.now,
        required: true,
        get : (updatedAt) => updatedAt.getTime(),
        set : (updatedAt) => new Date(updatedAt)
    },
    purpose: {
        type: String,
        required: [true, 'Please specify the purpose of the OTP'],
        enum: ['na','pay','verify'],
        default: 'na'
    },
    attempts: {
        type: [Date],
        default: []
    },
    isUsed: {
        type: Boolean,
        default: false
    },
});

otpSchema.pre('save', async function(next) {
    if (!this.isModified('isUsed')) {
        const existingOtp = await this.constructor.findOne({ user: this.user, otp: this.otp });
        if (existingOtp) {
            throw new Error('OTP already exists for this user');
        }
    }
    next();
});

otpSchema.methods.isExpired = function() {
    console.log('Checking if OTP is expired...');
    const currentTime = new Date();
    const updatedAt = this.updatedAt;
    const diff = currentTime - updatedAt;
    return diff > OtpExpTime;
}

export default mongoose.model('Otp', otpSchema);

