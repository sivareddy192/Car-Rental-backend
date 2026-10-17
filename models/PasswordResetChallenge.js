import mongoose from 'mongoose';

const passwordResetChallengeSchema = new mongoose.Schema(
  {
    email: {
      type: String,
      required: true,
      lowercase: true,
      trim: true,
      index: true,
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    otpHash: {
      type: String,
      required: true,
    },
    purpose: {
      type: String,
      default: 'password_reset',
    },
    expiresAt: {
      type: Date,
      required: true,
      index: { expires: 0 }, // TTL index auto-deletes expired challenges
    },
    attempts: {
      type: Number,
      default: 0,
    },
    maxAttempts: {
      type: Number,
      default: 3,
    },
    isLockedUntil: {
      type: Date,
      default: null,
    },
    isUsed: {
      type: Boolean,
      default: false,
    },
    verifiedAt: {
      type: Date,
      default: null,
    },
    resetToken: {
      type: String,
      default: null,
    },
    resetTokenExpiresAt: {
      type: Date,
      default: null,
    },
    ipAddress: {
      type: String,
      default: '',
    },
  },
  {
    timestamps: true,
  }
);

// Track daily send quota: Helper static method
passwordResetChallengeSchema.statics.getDailySendCount = async function (email) {
  const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
  return await this.countDocuments({
    email,
    createdAt: { $gte: oneDayAgo },
  });
};

export const PasswordResetChallenge = mongoose.model(
  'PasswordResetChallenge',
  passwordResetChallengeSchema
);
