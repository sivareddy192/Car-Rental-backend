import mongoose from 'mongoose';

const vehicleAvailabilityBlockSchema = new mongoose.Schema(
  {
    vehicleId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Vehicle',
      required: true,
      index: true,
    },
    startDate: {
      type: Date,
      required: true,
      index: true,
    },
    endDate: {
      type: Date,
      required: true,
      index: true,
    },
    reason: {
      type: String,
      enum: ['booking', 'maintenance', 'hold'],
      default: 'booking',
    },
    bookingId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Booking',
      default: null,
      index: true,
    },
    notes: {
      type: String,
      default: '',
    },
  },
  {
    timestamps: true,
  }
);

// Compound index for efficient range queries
vehicleAvailabilityBlockSchema.index({ vehicleId: 1, startDate: 1, endDate: 1 });

export const VehicleAvailabilityBlock = mongoose.model(
  'VehicleAvailabilityBlock',
  vehicleAvailabilityBlockSchema
);
