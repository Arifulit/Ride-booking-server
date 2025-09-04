import express, { Application, Request, Response } from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import rateLimit from "express-rate-limit";
import { errorHandler, notFound } from "./app/middlewares/error.middleware";
import apiRouter from "./app/routes";

const app: Application = express();

// --------------------
// 🔐 Security Middlewares
// --------------------
app.use(helmet()); // Secure HTTP headers
app.use(cors());   // Enable CORS

// --------------------
// ⚡ Rate Limiting
// --------------------
const limiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || "900000"), // default: 15 minutes
  max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || "100"),      // default: 100 requests
  message: { error: "Too many requests from this IP, please try again later." },
});
app.use("/api", limiter);

// --------------------
// 📜 Logging (only dev mode)
// --------------------
if (process.env.NODE_ENV === "development") {
  app.use(morgan("dev"));
}

// --------------------
// 📦 Body Parsers
// --------------------
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true }));

// --------------------
// 🚀 Root Route
// --------------------
app.get("/", (req: Request, res: Response) => {
  res.json({ message: "🚖 Ride Booking API root route working!" });
});

// --------------------
// 🏥 Health Check
// --------------------
app.get("/health", (req: Request, res: Response) => {
  res.status(200).json({
    success: true,
    message: "Ride Booking API is running successfully",
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || "development",
  });
});

// --------------------
// 📌 API Routes
// --------------------
app.use("/api/v1", apiRouter);

// --------------------
// ❌ Error Handlers
// --------------------
app.use(notFound);
app.use(errorHandler);

export default app;
