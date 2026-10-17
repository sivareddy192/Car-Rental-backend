import mongoose from 'mongoose';

const vehicleSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Vehicle name is required'],
      trim: true,
      index: true,
    },
    brand: {
      type: String,
      required: [true, 'Brand is required'],
      trim: true,
      index: true,
    },
    modelYear: {
      type: Number,
      required: true,
    },
    category: {
      type: String,
      required: true,
      enum: ['Self Drive', 'Taxi', 'Wedding', 'Luxury SUV', 'Supercar', 'Executive Sedan'],
      index: true,
    },
    taxiServices: {
      type: [String],
      enum: ['Airport Transfer', 'Local Rides', 'Luxury Chauffeur'],
      default: [],
    },
    pricePerDay: {
      type: Number,
      required: true,
      min: 0,
      index: true,
    },
    halfDayPrice: {
      type: Number,
      default: 0,
      min: 0,
    },
    hourlyRate: {
      type: Number,
      default: 0,
    },
    fuelType: {
      type: String,
      enum: ['Petrol', 'Diesel', 'Electric', 'Hybrid'],
      default: 'Petrol',
      index: true,
    },
    transmission: {
      type: String,
      enum: ['Automatic', 'Manual'],
      default: 'Automatic',
      index: true,
    },
    seatingCapacity: {
      type: Number,
      required: true,
      min: 2,
      max: 12,
      index: true,
    },
    luggageCapacity: {
      type: Number,
      default: 2,
    },
    features: {
      type: [String],
      default: [],
    },
    images: {
      type: [String],
      default: [],
    },
    mainImage: {
      type: String,
      required: true,
    },
    isAvailable: {
      type: Boolean,
      default: true,
      index: true,
    },
    mileageLimit: {
      type: String,
      default: 'Unlimited or 300 km/day',
    },
    registrationNumber: {
      type: String,
      trim: true,
      default: '',
    },
    location: {
      type: String,
      default: 'Hyderabad / Airport Concierge',
    },
    description: {
      type: String,
      required: true,
    },
    vehicleOverview: {
      type: String,
      default: '',
    },
    engineeringSpecifications: {
      type: [String],
      default: [],
    },
    rating: {
      type: Number,
      default: 5.0,
      min: 1,
      max: 5,
    },
    reviewsCount: {
      type: Number,
      default: 0,
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

export const Vehicle = mongoose.model('Vehicle', vehicleSchema);
