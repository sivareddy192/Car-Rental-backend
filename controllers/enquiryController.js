import { ServiceEnquiry } from '../models/ServiceEnquiry.js';
import { sendAdminEnquiryNotificationEmail } from '../services/emailService.js';

export const createEnquiry = async (req, res, next) => {
  try {
    const { enquiryType, name, email, phone, serviceDetails, dates } = req.body;

    if (!enquiryType || !name || !email || !phone) {
      return res.status(400).json({
        success: false,
        message: 'Please provide all mandatory contact and enquiry details.',
      });
    }

    const enquiry = await ServiceEnquiry.create({
      enquiryType,
      name: name.trim(),
      email: email.toLowerCase().trim(),
      phone: phone.trim(),
      serviceDetails: serviceDetails || {},
      dates: dates || {},
    });

    // Notify administration via Resend email
    await sendAdminEnquiryNotificationEmail({
      enquiryType,
      customerName: enquiry.name,
      customerEmail: enquiry.email,
      customerPhone: enquiry.phone,
      details: enquiry.serviceDetails,
    });

    res.status(201).json({
      success: true,
      message: 'Your concierge enquiry has been registered. Our mobility specialist will connect with you shortly.',
      enquiry,
    });
  } catch (error) {
    next(error);
  }
};

export const getEnquiries = async (req, res, next) => {
  try {
    const { type, status } = req.query;
    const query = {};

    if (type && type !== 'all') {
      query.enquiryType = type;
    }

    if (status && status !== 'all') {
      query.status = status;
    }

    const enquiries = await ServiceEnquiry.find(query).sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: enquiries.length,
      enquiries,
    });
  } catch (error) {
    next(error);
  }
};

export const updateEnquiryStatus = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { status, adminNotes } = req.body;

    const enquiry = await ServiceEnquiry.findByIdAndUpdate(
      id,
      { status, adminNotes },
      { new: true }
    );

    if (!enquiry) {
      return res.status(404).json({
        success: false,
        message: 'Enquiry not found.',
      });
    }

    res.status(200).json({
      success: true,
      message: 'Enquiry status updated.',
      enquiry,
    });
  } catch (error) {
    next(error);
  }
};
