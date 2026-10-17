import express from 'express';
import dotenv from 'dotenv';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import helmet from 'helmet';
import morgan from 'morgan';
import mongoose from 'mongoose';

import { connectDB } from './config/db.js';
import { apiLimiter } from './middleware/rateLimiter.js';
import { errorHandler } from './middleware/errorHandler.js';

import authRoutes from './routes/authRoutes.js';
import vehicleRoutes from './routes/vehicleRoutes.js';
import bookingRoutes from './routes/bookingRoutes.js';
import wishlistRoutes from './routes/wishlistRoutes.js';
import tourRoutes from './routes/tourRoutes.js';
import enquiryRoutes from './routes/enquiryRoutes.js';
import contactRoutes from './routes/contactRoutes.js';
import reviewRoutes from './routes/reviewRoutes.js';
import adminRoutes from './routes/adminRoutes.js';
import blogRoutes from './routes/blogRoutes.js';
import uploadRoutes from './routes/uploadRoutes.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Trust reverse proxy (required for rate limiting behind Vercel)
app.set('trust proxy', 1);

app.use(
  helmet({
    crossOriginResourcePolicy: { policy: 'cross-origin' },
  })
);

const allowedOrigins = [
  process.env.FRONTEND_URL || 'http://localhost:5174'
];

app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(null, true); 
      }
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  })
);

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(cookieParser());

if (process.env.NODE_ENV !== 'test') {
  app.use(morgan('dev'));
}

// 1. Root route - Checks/connects to DB and reports status
app.get('/', async (req, res) => {
  try {
    await connectDB();
  } catch (error) {
    console.error('Root route DB connection error:', error.message);
  }
  const dbStatus = mongoose.connection.readyState === 1 ? 'connected' : 'disconnected';
  res.status(200).json({
    status: 'healthy',
    message: 'Royal Drives Car Rental API is running',
    database: dbStatus,
    version: '1.0.0',
    endpoints: {
      health: '/api/health',
      vehicles: '/api/vehicles',
      bookings: '/api/bookings',
      tours: '/api/tours',
      auth: '/api/auth',
    },
  });
});

// 2. Health check endpoint
app.get('/api/health', async (req, res) => {
  try {
    await connectDB();
  } catch (error) {
    console.error('Health check DB connection error:', error.message);
  }
  const dbStatus = mongoose.connection.readyState === 1 ? 'connected' : 'disconnected';
  res.status(200).json({
    status: 'healthy',
    database: dbStatus,
    timestamp: new Date().toISOString(),
    service: 'Car Rental API',
    emailProvider: 'Resend Exclusive',
  });
});

app.get('/api', (req, res) => {
  res.status(200).json({
    status: 'healthy',
    message: 'Royal Drives API base endpoint',
    health: '/api/health',
  });
});

// 3. API Rate limiting
app.use('/api', apiLimiter);

// 4. Safe DB connection middleware for API routes that need the database
app.use('/api', async (req, res, next) => {
  try {
    await connectDB();
    next();
  } catch (error) {
    console.error('Database connection error in request:', error.message);
    return res.status(503).json({
      success: false,
      message: 'Database connection failed. Please ensure MONGODB_URI is set in Vercel environment variables and MongoDB Atlas allows access from all IPs (0.0.0.0/0).',
      error: error.message,
    });
  }
});

// 5. Functional API routes
app.use('/api/auth', authRoutes);
app.use('/api/user', authRoutes);
app.use('/api/vehicles', vehicleRoutes);
app.use('/api/product', vehicleRoutes);
app.use('/api/bookings', bookingRoutes);
app.use('/api/order', bookingRoutes);
app.use('/api/wishlist', wishlistRoutes);
app.use('/api/tours', tourRoutes);
app.use('/api/enquiries', enquiryRoutes);
app.use('/api/contact', contactRoutes);
app.use('/api/reviews', reviewRoutes);
app.use('/api/blogs', blogRoutes);
app.use('/api/uploads', uploadRoutes);
app.use('/api/admin', adminRoutes);

// Catch-all 404 handler for any unhandled routes
app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    message: `Route '${req.originalUrl}' not found on this server.`,
  });
});

app.use(errorHandler);

const startServer = async () => {
  try {
    await connectDB();

    const server = app.listen(PORT, () => {
      console.log(`Server running on: http://localhost:${PORT}`);
      console.log(`Email Provider: ${process.env.RESEND_FROM_EMAIL}`);
    });

    server.on('error', (error) => {
      if (error.code === 'EADDRINUSE') {
        console.error(
          `Port ${PORT} is already in use. Stop the existing backend process or set a different PORT in backend/.env before starting the server.`
        );
      } else {
        console.error('Failed to start the backend server:', error);
      }
      process.exit(1);
    });
  } catch (error) {
    console.error('Backend startup failed:', error.message);
    process.exit(1);
  }
};

// Start local listener only if not running in Vercel serverless environment
if (!process.env.VERCEL && process.env.NODE_ENV !== 'test') {
  startServer();
}

export default app;
