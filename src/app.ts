import express, { Application, Request, Response } from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import rateLimit from "express-rate-limit";
import apiRouter from "./app/routes";
import { errorHandler, notFound } from "./app/middlewares/error.middleware";

const app: Application = express();

// Security
app.use(helmet()); // Secure HTTP headers

// CORS: allow frontend URL or all in development
app.use(cors({
  origin: process.env.FRONTEND_URL || "http://localhost:5173", // fallback for dev
  credentials: true,
}));

// Rate Limiting
const limiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || "900000"), // 15 minutes
  max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || "100"),
  message: { error: "Too many requests from this IP, try again later." },
});
app.use("/api", limiter);

// Logging
if (process.env.NODE_ENV === "development") {
  app.use(morgan("dev"));
}

// Body Parsers
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true }));

// Routes
app.get("/", (_req: Request, res: Response) => {
  res.json({ message: "🚖 Ride Booking API root route working!" });
});

app.get("/health", (_req: Request, res: Response) => {
  res.status(200).json({
    success: true,
    message: "Ride Booking API is running successfully",
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || "development",
  });
});

app.use("/api/v1", apiRouter);

// Error Handling
app.use(notFound); // 404 middleware
app.use(errorHandler); // Global error handler

export default app;