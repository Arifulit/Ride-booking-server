import express, { Application, Request, Response } from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import rateLimit from "express-rate-limit";
import { errorHandler, notFound } from "./app/middlewares/error.middleware";
import apiRouter from "./app/routes";

const app: Application = express();

// Security middlewares
app.use(helmet()); // Set security-related HTTP headers
app.use(cors()); // Enable Cross-Origin Resource Sharing

// Rate limiting configuration
const limiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || "900000"), // Time window (default: 15 minutes)
  max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || "100"), // Max requests per window (default: 100)
  message: { error: "Too many requests from this IP, please try again later." },
});
app.use("/api", limiter); // Apply rate limiter to all /api routes

// Logging (enabled only in development mode)
if (process.env.NODE_ENV === "development") {
  app.use(morgan("dev")); // Log HTTP requests
}

// Body parsers
app.use(express.json({ limit: "10mb" })); // Parse JSON payloads (max size 10MB)
app.use(express.urlencoded({ extended: true })); // Parse URL-encoded payloads

// Root route
app.get("/", (req: Request, res: Response) => {
  res.json({ message: "🚖 Ride Booking API root route working!" });
});

// Health check endpoint
app.get("/health", (req: Request, res: Response) => {
  res.status(200).json({
    success: true,
    message: "Ride Booking API is running successfully",
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || "development",
  });
});

// API routes
app.use("/api/v1", apiRouter);

// Error handling middlewares
app.use(notFound); // Handle 404 Not Found
app.use(errorHandler); // Handle other errors

export default app;
