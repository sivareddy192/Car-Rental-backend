import { Wishlist } from '../models/Wishlist.js';

export const getWishlist = async (req, res, next) => {
  try {
    const items = await Wishlist.find({ userId: req.user._id })
      .populate('vehicleId')
      .sort({ createdAt: -1 });

    const vehicles = items
      .filter((item) => item.vehicleId) // ensure vehicle still exists
      .map((item) => item.vehicleId);

    res.status(200).json({
      success: true,
      count: vehicles.length,
      vehicles,
    });
  } catch (error) {
    next(error);
  }
};

export const addToWishlist = async (req, res, next) => {
  try {
    const { vehicleId } = req.params;

    const existing = await Wishlist.findOne({
      userId: req.user._id,
      vehicleId,
    });

    if (existing) {
      return res.status(200).json({
        success: true,
        message: 'Vehicle is already saved in your wishlist.',
      });
    }

    await Wishlist.create({
      userId: req.user._id,
      vehicleId,
    });

    res.status(201).json({
      success: true,
      message: 'Vehicle added to your wishlist.',
    });
  } catch (error) {
    next(error);
  }
};

export const removeFromWishlist = async (req, res, next) => {
  try {
    const { vehicleId } = req.params;

    await Wishlist.findOneAndDelete({
      userId: req.user._id,
      vehicleId,
    });

    res.status(200).json({
      success: true,
      message: 'Vehicle removed from your wishlist.',
    });
  } catch (error) {
    next(error);
  }
};
