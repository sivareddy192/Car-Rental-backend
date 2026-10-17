import crypto from 'crypto';
import { Booking } from '../models/Booking.js';
import { Vehicle } from '../models/Vehicle.js';
import { VehicleAvailabilityBlock } from '../models/VehicleAvailabilityBlock.js';
import { AuditLog } from '../models/AuditLog.js';
import {
  sendBookingConfirmationEmail,
  sendBookingCancellationEmail,
  sendBookingStatusUpdateEmail,
} from '../services/emailService.js';

// Helper: Generate unique reference like RD-78421
const generateBookingReference = () => {
  const randomNum = Math.floor(10000 + Math.random() * 90000);
  return `RD-${new Date().getFullYear()}-${randomNum}`;
};

/**
 * Create a new Booking with atomic double-booking prevention
 */
export const createBooking = async (req, res, next) => {
  try {
    const {
      vehicleId,
      serviceType = 'Self Drive',
      startDate,
      endDate,
      pickupLocation,
      dropoffLocation,
      pickupTime,
      passengerCount,
      customerName,
      customerEmail,
      customerPhone,
      specialRequests,
    } = req.body;

    if (!vehicleId || !startDate || !endDate || !pickupLocation || !dropoffLocation) {
      return res.status(400).json({
        success: false,
        message: 'Please provide all mandatory booking details.',
      });
    }

    const start = new Date(startDate);
    const end = new Date(endDate);

    if (start >= end) {
      return res.status(400).json({
        success: false,
        message: 'Dropoff date must be after pickup date.',
      });
    }

    const now = new Date();
    // Allow same day, but start cannot be significantly in the past
    if (start < new Date(now.setHours(0, 0, 0, 0))) {
      return res.status(400).json({
        success: false,
        message: 'Pickup date cannot be in the past.',
      });
    }

    // Fetch vehicle
    const vehicle = await Vehicle.findById(vehicleId);
    if (!vehicle || !vehicle.isAvailable) {
      return res.status(400).json({
        success: false,
        message: 'Selected vehicle is currently unavailable or decommissioned.',
      });
    }

    // Atomic double-booking check: Ensure no overlapping confirmed or pending bookings
    const overlappingBookings = await Booking.find({
      vehicleId,
      status: { $in: ['confirmed', 'ongoing', 'pending'] },
      $or: [{ startDate: { $lte: end }, endDate: { $gte: start } }],
    });

    if (overlappingBookings.length > 0) {
      return res.status(409).json({
        success: false,
        message: 'This vehicle is already reserved for the selected dates. Please choose alternative dates.',
      });
    }

    // Also check maintenance blocks
    const overlappingBlocks = await VehicleAvailabilityBlock.find({
      vehicleId,
      $or: [{ startDate: { $lte: end }, endDate: { $gte: start } }],
    });

    if (overlappingBlocks.length > 0) {
      return res.status(409).json({
        success: false,
        message: 'Vehicle is scheduled for fleet service or maintenance during these dates.',
      });
    }

    // Calculate total days and amount
    const diffTime = Math.abs(end - start);
    const totalDays = Math.max(1, Math.ceil(diffTime / (1000 * 60 * 60 * 24)));
    const totalAmount = totalDays * vehicle.pricePerDay;
    const depositAmount = Math.round(totalAmount * 0.2); // 20% refundable security deposit

    const bookingReference = generateBookingReference();

    // Create booking
    const booking = await Booking.create({
      bookingReference,
      userId: req.user._id,
      vehicleId,
      serviceType,
      startDate: start,
      endDate: end,
      totalDays,
      totalAmount,
      depositAmount,
      status: 'confirmed', // Auto-confirm on reservation request for luxury customer convenience
      paymentStatus: 'paid', // Simulated test checkout
      pickupLocation,
      dropoffLocation,
      pickupTime: pickupTime || '',
      passengerCount: Number(passengerCount) || 1,
      customerName: customerName || req.user.name,
      customerEmail: (customerEmail || req.user.email).toLowerCase(),
      customerPhone: customerPhone || req.user.phone || '+91 98765 43210',
      specialRequests: specialRequests || '',
    });

    // Create availability block to atomically seal the date range
    await VehicleAvailabilityBlock.create({
      vehicleId,
      startDate: start,
      endDate: end,
      reason: 'booking',
      bookingId: booking._id,
      notes: `Reservation ref ${bookingReference}`,
    });

    // Send confirmation email via Resend
    await sendBookingConfirmationEmail({
      to: booking.customerEmail,
      name: booking.customerName,
      bookingReference: booking.bookingReference,
      vehicleName: `${vehicle.brand} ${vehicle.name}`,
      startDate: booking.startDate,
      endDate: booking.endDate,
      totalAmount: booking.totalAmount,
      pickupLocation: booking.pickupLocation,
      dropoffLocation: booking.dropoffLocation,
    });

    // Audit log
    await AuditLog.create({
      action: 'BOOKING_CREATED',
      performedBy: req.user._id,
      ipAddress: req.ip || '',
      details: { bookingReference, vehicle: vehicle.name, totalAmount },
      targetModel: 'Booking',
      targetId: booking._id.toString(),
    });

    res.status(201).json({
      success: true,
      message: 'Booking confirmed successfully! A detailed voucher has been sent to your email.',
      booking,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get Current User's Bookings
 */
export const getMyBookings = async (req, res, next) => {
  try {
    const { status } = req.query;
    const query = { userId: req.user._id };

    if (status && status !== 'all') {
      query.status = status;
    }

    const bookings = await Booking.find(query)
      .populate('vehicleId', 'name brand mainImage category pricePerDay registrationNumber')
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: bookings.length,
      bookings,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get Booking by ID
 */
export const getBookingById = async (req, res, next) => {
  try {
    const booking = await Booking.findById(req.params.id)
      .populate('vehicleId')
      .populate('userId', 'name email phone');

    if (!booking) {
      return res.status(404).json({
        success: false,
        message: 'Booking reservation not found.',
      });
    }

    // Verify user owns the booking or is admin
    if (booking.userId._id.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Unauthorized access to this reservation.',
      });
    }

    res.status(200).json({
      success: true,
      booking,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Cancel Booking & restore vehicle availability
 */
export const cancelBooking = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;

    const booking = await Booking.findById(id).populate('vehicleId');
    if (!booking) {
      return res.status(404).json({
        success: false,
        message: 'Booking reservation not found.',
      });
    }

    if (booking.userId.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Unauthorized action.',
      });
    }

    if (booking.status === 'cancelled') {
      return res.status(400).json({
        success: false,
        message: 'This booking is already cancelled.',
      });
    }

    booking.status = 'cancelled';
    booking.cancellationReason = reason || 'Customer requested cancellation';
    booking.cancelledAt = new Date();
    await booking.save();

    // Release vehicle availability blocks
    await VehicleAvailabilityBlock.deleteMany({ bookingId: booking._id });

    // Send cancellation email via Resend
    await sendBookingCancellationEmail({
      to: booking.customerEmail,
      name: booking.customerName,
      bookingReference: booking.bookingReference,
      vehicleName: booking.vehicleId ? `${booking.vehicleId.brand} ${booking.vehicleId.name}` : 'Reserved Vehicle',
      cancellationReason: booking.cancellationReason,
    });

    res.status(200).json({
      success: true,
      message: 'Booking cancelled successfully and vehicle availability restored.',
      booking,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Admin: Get all bookings with filtering & pagination
 */
export const getAllBookings = async (req, res, next) => {
  try {
    const { status, search, page = 1, limit = 20 } = req.query;
    const query = {};

    if (status && status !== 'all') {
      query.status = status;
    }

    if (search) {
      query.$or = [
        { bookingReference: { $regex: search, $options: 'i' } },
        { customerName: { $regex: search, $options: 'i' } },
        { customerEmail: { $regex: search, $options: 'i' } },
      ];
    }

    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const skip = (pageNum - 1) * limitNum;

    const [bookings, total] = await Promise.all([
      Booking.find(query)
        .populate('vehicleId', 'name brand mainImage registrationNumber')
        .populate('userId', 'name email phone')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limitNum),
      Booking.countDocuments(query),
    ]);

    res.status(200).json({
      success: true,
      total,
      totalPages: Math.ceil(total / limitNum),
      currentPage: pageNum,
      bookings,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Admin: Update booking status (confirm, ongoing, complete, etc.)
 */
export const updateBookingStatus = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { status, notes } = req.body;

    const booking = await Booking.findById(id).populate('vehicleId');
    if (!booking) {
      return res.status(404).json({
        success: false,
        message: 'Booking not found.',
      });
    }

    const previousStatus = booking.status;
    booking.status = status;
    await booking.save();

    // If cancelled by admin, release blocks
    if (status === 'cancelled') {
      await VehicleAvailabilityBlock.deleteMany({ bookingId: booking._id });
    }

    // Send update email via Resend
    await sendBookingStatusUpdateEmail({
      to: booking.customerEmail,
      name: booking.customerName,
      bookingReference: booking.bookingReference,
      vehicleName: booking.vehicleId ? `${booking.vehicleId.brand} ${booking.vehicleId.name}` : 'Reserved Vehicle',
      newStatus: status,
      notes,
    });

    res.status(200).json({
      success: true,
      message: `Booking status changed from ${previousStatus} to ${status}.`,
      booking,
    });
  } catch (error) {
    next(error);
  }
};
