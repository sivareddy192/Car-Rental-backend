import express from 'express';
import dotenv from 'dotenv';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import helmet from 'helmet';
import morgan from 'morgan';

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
app.use('/api', apiLimiter);


app.get('/api/health', (req, res) => {
  res.status(200).json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    service: 'Car Rental API',
    emailProvider: 'Resend Exclusive',
  });
});


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


app.use('/api/*', (req, res) => {
  res.status(404).json({
    success: false,
    message: `API endpoint '${req.originalUrl}' not found.`,
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

startServer();

export default app;
