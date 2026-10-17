import { Review } from '../models/Review.js';
import { Vehicle } from '../models/Vehicle.js';

export const getVehicleReviews = async (req, res, next) => {
  try {
    const reviews = await Review.find({
      vehicleId: req.params.vehicleId,
      isApproved: true,
    })
      .populate('userId', 'name avatar')
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: reviews.length,
      reviews,
    });
  } catch (error) {
    next(error);
  }
};

export const submitReview = async (req, res, next) => {
  try {
    const { vehicleId, rating, comment, title } = req.body;

    if (!vehicleId || !rating || !comment) {
      return res.status(400).json({
        success: false,
        message: 'Please provide vehicle, star rating, and review comments.',
      });
    }

    const review = await Review.create({
      vehicleId,
      userId: req.user._id,
      rating: Number(rating),
      comment: comment.trim(),
      title: title || '',
      isApproved: true, // auto-approve verified customer reviews
    });

    // Update vehicle's aggregated rating
    const allReviews = await Review.find({ vehicleId, isApproved: true });
    const avgRating =
      allReviews.reduce((sum, item) => sum + item.rating, 0) / allReviews.length;

    await Vehicle.findByIdAndUpdate(vehicleId, {
      rating: Number(avgRating.toFixed(1)),
      reviewsCount: allReviews.length,
    });

    res.status(201).json({
      success: true,
      message: 'Review submitted. Thank you for your feedback.',
      review,
    });
  } catch (error) {
    next(error);
  }
};
