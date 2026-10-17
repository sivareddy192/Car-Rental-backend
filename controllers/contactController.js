import { ContactMessage } from '../models/ContactMessage.js';

export const submitContact = async (req, res, next) => {
  try {
    const { name, email, phone, subject, message, botCheck } = req.body;

    // Spam protection honeypot: If botCheck is filled by automated scripts, silently accept without storing
    if (botCheck) {
      return res.status(200).json({
        success: true,
        message: 'Your message has been received.',
      });
    }

    if (!name || !email || !subject || !message) {
      return res.status(400).json({
        success: false,
        message: 'Please complete all required fields.',
      });
    }

    const contact = await ContactMessage.create({
      name: name.trim(),
      email: email.toLowerCase().trim(),
      phone: phone ? phone.trim() : '',
      subject: subject.trim(),
      message: message.trim(),
    });

    res.status(201).json({
      success: true,
      message: 'Thank you for contacting Car Rental. Our executive team will respond within 24 business hours.',
      contact,
    });
  } catch (error) {
    next(error);
  }
};

export const getContactMessages = async (req, res, next) => {
  try {
    const messages = await ContactMessage.find().sort({ createdAt: -1 });
    res.status(200).json({
      success: true,
      count: messages.length,
      messages,
    });
  } catch (error) {
    next(error);
  }
};

export const markContactRead = async (req, res, next) => {
  try {
    const { id } = req.params;
    const message = await ContactMessage.findByIdAndUpdate(
      id,
      { isRead: true },
      { new: true }
    );

    if (!message) {
      return res.status(404).json({
        success: false,
        message: 'Message not found.',
      });
    }

    res.status(200).json({
      success: true,
      message,
    });
  } catch (error) {
    next(error);
  }
};
