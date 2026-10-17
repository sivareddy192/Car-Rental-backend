import { Booking } from '../models/Booking.js';
import { Vehicle } from '../models/Vehicle.js';
import { User } from '../models/User.js';
import { ServiceEnquiry } from '../models/ServiceEnquiry.js';
import { ContactMessage } from '../models/ContactMessage.js';
import { AuditLog } from '../models/AuditLog.js';

export const getDashboardAnalytics = async (req, res, next) => {
  try {
    const [
      totalVehicles,
      totalUsers,
      totalBookings,
      pendingBookings,
      confirmedBookings,
      enquiriesCount,
      unreadMessages,
      allCompletedBookings,
    ] = await Promise.all([
      Vehicle.countDocuments(),
      User.countDocuments({ role: 'user' }),
      Booking.countDocuments(),
      Booking.countDocuments({ status: 'pending' }),
      Booking.countDocuments({ status: 'confirmed' }),
      ServiceEnquiry.countDocuments({ status: 'new' }),
      ContactMessage.countDocuments({ isRead: false }),
      Booking.find({ status: { $in: ['confirmed', 'completed', 'ongoing'] } }),
    ]);

    const totalRevenue = allCompletedBookings.reduce(
      (sum, b) => sum + (b.totalAmount || 0),
      0
    );

    // Recent 5 bookings
    const recentBookings = await Booking.find()
      .populate('vehicleId', 'name brand mainImage')
      .populate('userId', 'name email')
      .sort({ createdAt: -1 })
      .limit(6);

    // Recent 5 enquiries
    const recentEnquiries = await ServiceEnquiry.find()
      .sort({ createdAt: -1 })
      .limit(6);

    res.status(200).json({
      success: true,
      stats: {
        totalRevenue,
        totalVehicles,
        totalUsers,
        totalBookings,
        pendingBookings,
        confirmedBookings,
        enquiriesCount,
        unreadMessages,
      },
      recentBookings,
      recentEnquiries,
    });
  } catch (error) {
    next(error);
  }
};

export const getCustomers = async (req, res, next) => {
  try {
    const users = await User.find().select('-password').sort({ createdAt: -1 });
    res.status(200).json({
      success: true,
      count: users.length,
      users,
    });
  } catch (error) {
    next(error);
  }
};

export const updateCustomerRole = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { role } = req.body;

    if (!['user', 'admin'].includes(role)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid role assignment.',
      });
    }

    const user = await User.findByIdAndUpdate(id, { role }, { new: true }).select('-password');
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found.',
      });
    }

    res.status(200).json({
      success: true,
      message: `User role updated to ${role}.`,
      user,
    });
  } catch (error) {
    next(error);
  }
};

export const getAuditLogs = async (req, res, next) => {
  try {
    const logs = await AuditLog.find()
      .populate('performedBy', 'name email')
      .sort({ createdAt: -1 })
      .limit(50);

    res.status(200).json({
      success: true,
      count: logs.length,
      logs,
    });
  } catch (error) {
    next(error);
  }
};
