const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');

// Import routes
const authRoutes = require('./modules/auth/auth.routes');
const userRoutes = require('./modules/user/user.routes');
const driverRoutes = require('./modules/driver/driver.routes');
const rideRoutes = require('./modules/ride/ride.routes');
const adminRoutes = require('./modules/admin/admin.routes');

// Import middleware
const { errorHandler, notFound } = require('./middlewares/error.middleware');

const app = express();

// Security middleware
app.use(helmet());
app.use(cors());

// Rate limiting
const limiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000, // 15 minutes
  max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 100,
  message: {
    error: 'Too many requests from this IP, please try again later.'
  }
});

app.get("/", (req, res) => {
  res.json({ message: "Ride Booking API root route working 🚀" });
});

app.use('/api', limiter);

// Logging
if (process.env.NODE_ENV === 'development') {
  app.use(morgan('dev'));
}

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'Ride Booking API is running successfully',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV
  });
});

// API routes
const API_VERSION = process.env.API_VERSION || 'v1';
app.use(`/api/${API_VERSION}/auth`, authRoutes);
app.use(`/api/${API_VERSION}/users`, userRoutes);
app.use(`/api/${API_VERSION}/drivers`, driverRoutes);
app.use(`/api/${API_VERSION}/rides`, rideRoutes);
app.use(`/api/${API_VERSION}/admin`, adminRoutes);

// Error handling middleware
app.use(notFound);
app.use(errorHandler);

module.exports = app;