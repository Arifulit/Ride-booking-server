import express, { Application, Request, Response } from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import rateLimit from "express-rate-limit";
import { errorHandler, notFound } from "./app/middlewares/error.middleware";
import apiRouter from "./app/routes/index";

const app: Application = express();

// Security middleware
app.use(helmet());
app.use(cors());

// Rate limiting
const limiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || "900000"), // 15 minutes
  max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || "100"),
  message: {
    error: "Too many requests from this IP, please try again later.",
  },
});

app.get("/", (req: Request, res: Response) => {
  res.json({ message: "Ride Booking API root route working 🚀" });
});

app.use("/api", limiter);

// Logging
if (process.env.NODE_ENV === "development") {
  app.use(morgan("dev"));
}

// Body parsing middleware
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true }));

// Health check endpoint
app.get("/health", (req: Request, res: Response) => {
  res.status(200).json({
    success: true,
    message: "Ride Booking API is running successfully",
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV,
  });
});

// Mount API routes
app.use("/api/v1", apiRouter);

// Error handling middleware
app.use(notFound);
app.use(errorHandler);

export default app;