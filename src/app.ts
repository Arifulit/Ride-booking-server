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
  origin: process.env.FRONTEND_URL || "https://ride-booking-client-bay.vercel.app" || "http://localhost:5173", // fallback for dev
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

// Handle malformed JSON body errors from express.json
app.use((err: any, req: Request, res: Response, next: any) => {
  // If body parser failed due to empty JSON input (common when a client sets
  // Content-Type: application/json but sends no body), allow safe methods to
  // continue with an empty body instead of returning a 400. This prevents
  // clients from receiving an empty/non-JSON response that causes
  // `Unexpected end of JSON input` on the client side.
  const isEntityParseFailed = err && err.type === "entity.parse.failed";
  const isSyntaxError = err instanceof SyntaxError && "body" in err;

  const isEmptyBodyError = (err && typeof err.message === "string" && /Unexpected end of JSON input/i.test(err.message));
  const safeMethods = ["GET", "HEAD", "DELETE"];

  if ((isEntityParseFailed || isSyntaxError) && isEmptyBodyError && safeMethods.includes(req.method)) {
    // treat as empty body and continue
    (req as any).body = {};
    return next();
  }

  if (isEntityParseFailed) {
    // body-parser style error
    return res.status(400).json({
      success: false,
      message: "Malformed JSON body",
      errors: err.message,
      timestamp: new Date().toISOString(),
    });
  }

  if (isSyntaxError) {
    return res.status(400).json({
      success: false,
      message: "Invalid JSON payload",
      errors: err.message,
      timestamp: new Date().toISOString(),
    });
  }

  next(err);
});

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