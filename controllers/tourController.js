import { TourPackage } from '../models/TourPackage.js';

export const getTours = async (req, res, next) => {
  try {
    const { destination, featured } = req.query;
    const query = {};

    if (destination) {
      query.destination = { $regex: destination, $options: 'i' };
    }

    if (featured === 'true') {
      query.isFeatured = true;
    }

    const tours = await TourPackage.find(query).sort({ isFeatured: -1, createdAt: -1 });

    res.status(200).json({
      success: true,
      count: tours.length,
      tours,
    });
  } catch (error) {
    next(error);
  }
};

export const getTourById = async (req, res, next) => {
  try {
    const tour = await TourPackage.findById(req.params.id);
    if (!tour) {
      return res.status(404).json({
        success: false,
        message: 'Tour package not found.',
      });
    }

    res.status(200).json({
      success: true,
      tour,
    });
  } catch (error) {
    next(error);
  }
};

export const createTour = async (req, res, next) => {
  try {
    const tour = await TourPackage.create(req.body);
    res.status(201).json({
      success: true,
      message: 'Tour package created successfully.',
      tour,
    });
  } catch (error) {
    next(error);
  }
};

export const updateTour = async (req, res, next) => {
  try {
    const tour = await TourPackage.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    });

    if (!tour) {
      return res.status(404).json({
        success: false,
        message: 'Tour package not found.',
      });
    }

    res.status(200).json({
      success: true,
      message: 'Tour package updated.',
      tour,
    });
  } catch (error) {
    next(error);
  }
};

export const deleteTour = async (req, res, next) => {
  try {
    const tour = await TourPackage.findByIdAndDelete(req.params.id);
    if (!tour) {
      return res.status(404).json({
        success: false,
        message: 'Tour package not found.',
      });
    }

    res.status(200).json({
      success: true,
      message: 'Tour package removed.',
    });
  } catch (error) {
    next(error);
  }
};
