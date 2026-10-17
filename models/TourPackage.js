import mongoose from 'mongoose';

const tourPackageSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true,
    },
    slug: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    destination: {
      type: String,
      required: true,
      index: true,
    },
    durationDays: {
      type: Number,
      required: true,
    },
    durationNights: {
      type: Number,
      required: true,
    },
    pricePerPerson: {
      type: Number,
      required: true,
    },
    overview: {
      type: String,
      required: true,
    },
    highlights: {
      type: [String],
      default: [],
    },
    itinerary: [
      {
        day: Number,
        title: String,
        description: String,
        meals: String,
      },
    ],
    included: {
      type: [String],
      default: [],
    },
    excluded: {
      type: [String],
      default: [],
    },
    mainImage: {
      type: String,
      required: true,
    },
    images: {
      type: [String],
      default: [],
    },
    maxGroupSize: {
      type: Number,
      default: 8,
    },
    isFeatured: {
      type: Boolean,
      default: false,
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

export const TourPackage = mongoose.model('TourPackage', tourPackageSchema);
