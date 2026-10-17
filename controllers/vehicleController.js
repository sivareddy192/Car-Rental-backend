import { Vehicle } from '../models/Vehicle.js';
import { Booking } from '../models/Booking.js';
import { VehicleAvailabilityBlock } from '../models/VehicleAvailabilityBlock.js';
import { Review } from '../models/Review.js';

/**
 * List Vehicles with advanced search & filters
 */
export const listVehicles = async (req, res, next) => {
  try {
    const {
      category,
      taxiService,
      brand,
      fuelType,
      transmission,
      seats,
      minPrice,
      maxPrice,
      search,
      sort = 'featured',
      page = 1,
      limit = 12,
    } = req.query;

    const query = { isAvailable: true };

    if (category && category !== 'All') {
      query.category = category;
    }

    if (taxiService && taxiService !== 'All') {
      query.taxiServices = taxiService;
    }

    if (brand && brand !== 'All') {
      query.brand = brand;
    }

    if (fuelType && fuelType !== 'All') {
      query.fuelType = fuelType;
    }

    if (transmission && transmission !== 'All') {
      query.transmission = transmission;
    }

    if (seats && seats !== 'All') {
      query.seatingCapacity = { $gte: Number(seats) };
    }

    if (minPrice || maxPrice) {
      query.pricePerDay = {};
      if (minPrice) query.pricePerDay.$gte = Number(minPrice);
      if (maxPrice) query.pricePerDay.$lte = Number(maxPrice);
    }

    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { brand: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } },
        { category: { $regex: search, $options: 'i' } },
      ];
    }

    let sortOption = {};
    if (sort === 'price-asc') sortOption = { pricePerDay: 1 };
    else if (sort === 'price-desc') sortOption = { pricePerDay: -1 };
    else if (sort === 'rating') sortOption = { rating: -1 };
    else if (sort === 'newest') sortOption = { createdAt: -1 };
    else sortOption = { isFeatured: -1, createdAt: -1 };

    const pageNum = Math.max(1, parseInt(page));
    const limitNum = Math.max(1, parseInt(limit));
    const skip = (pageNum - 1) * limitNum;

    const [vehicles, total] = await Promise.all([
      Vehicle.find(query).sort(sortOption).skip(skip).limit(limitNum),
      Vehicle.countDocuments(query),
    ]);

    res.status(200).json({
      success: true,
      count: vehicles.length,
      total,
      totalPages: Math.ceil(total / limitNum),
      currentPage: pageNum,
      vehicles,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get Vehicle Details by ID
 */
export const getVehicleById = async (req, res, next) => {
  try {
    const vehicle = await Vehicle.findById(req.params.id);
    if (!vehicle) {
      return res.status(404).json({
        success: false,
        message: 'Vehicle not found.',
      });
    }

    const reviews = await Review.find({ vehicleId: vehicle._id, isApproved: true })
      .populate('userId', 'name avatar')
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      vehicle,
      reviews,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Check vehicle availability for date range
 */
export const checkVehicleAvailability = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { startDate, endDate } = req.query;

    if (!startDate || !endDate) {
      return res.status(400).json({
        success: false,
        message: 'Please provide both startDate and endDate.',
      });
    }

    const start = new Date(startDate);
    const end = new Date(endDate);

    if (start >= end) {
      return res.status(400).json({
        success: false,
        message: 'End date must be after start date.',
      });
    }

    // Check existing active bookings overlapping the range
    const overlappingBookings = await Booking.find({
      vehicleId: id,
      status: { $in: ['confirmed', 'ongoing', 'pending'] },
      $or: [
        { startDate: { $lte: end }, endDate: { $gte: start } },
      ],
    });

    // Check maintenance or admin blocks
    const overlappingBlocks = await VehicleAvailabilityBlock.find({
      vehicleId: id,
      $or: [
        { startDate: { $lte: end }, endDate: { $gte: start } },
      ],
    });

    const isAvailable = overlappingBookings.length === 0 && overlappingBlocks.length === 0;

    res.status(200).json({
      success: true,
      vehicleId: id,
      startDate: start,
      endDate: end,
      isAvailable,
      conflictsCount: overlappingBookings.length + overlappingBlocks.length,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Admin: Create Vehicle
 */
export const createVehicle = async (req, res, next) => {
  try {
    const vehicle = await Vehicle.create(req.body);
    res.status(201).json({
      success: true,
      message: 'Vehicle added to fleet successfully.',
      vehicle,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Admin: Update Vehicle
 */
export const updateVehicle = async (req, res, next) => {
  try {
    const vehicle = await Vehicle.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    });

    if (!vehicle) {
      return res.status(404).json({
        success: false,
        message: 'Vehicle not found.',
      });
    }

    res.status(200).json({
      success: true,
      message: 'Vehicle updated successfully.',
      vehicle,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Admin: Delete Vehicle
 */
export const deleteVehicle = async (req, res, next) => {
  try {
    const vehicle = await Vehicle.findByIdAndDelete(req.params.id);
    if (!vehicle) {
      return res.status(404).json({
        success: false,
        message: 'Vehicle not found.',
      });
    }

    res.status(200).json({
      success: true,
      message: 'Vehicle deleted from fleet.',
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Admin: Block vehicle dates for maintenance
 */
export const blockVehicleDates = async (req, res, next) => {
  try {
    const { vehicleId, startDate, endDate, reason, notes } = req.body;

    const block = await VehicleAvailabilityBlock.create({
      vehicleId,
      startDate: new Date(startDate),
      endDate: new Date(endDate),
      reason: reason || 'maintenance',
      notes,
    });

    res.status(201).json({
      success: true,
      message: 'Vehicle dates blocked successfully.',
      block,
    });
  } catch (error) {
    next(error);
  }
};
