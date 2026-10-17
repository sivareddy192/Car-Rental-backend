import mongoose from 'mongoose';

const serviceEnquirySchema = new mongoose.Schema(
  {
    enquiryType: {
      type: String,
      required: true,
      enum: ['taxi', 'nri', 'wedding', 'tour', 'custom'],
      index: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
    email: {
      type: String,
      required: true,
      lowercase: true,
      trim: true,
    },
    phone: {
      type: String,
      required: true,
      trim: true,
    },
    serviceDetails: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
    dates: {
      startDate: Date,
      endDate: Date,
    },
    status: {
      type: String,
      enum: ['new', 'in_progress', 'contacted', 'resolved'],
      default: 'new',
      index: true,
    },
    adminNotes: {
      type: String,
      default: '',
    },
  },
  {
    timestamps: true,
  }
);

export const ServiceEnquiry = mongoose.model('ServiceEnquiry', serviceEnquirySchema);
