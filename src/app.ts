/* eslint-disable no-unused-vars */
// import express, { Application, Request, Response } from "express";
// import cors from "cors";
// import helmet from "helmet";
// import morgan from "morgan";
// import rateLimit from "express-rate-limit";
// import apiRouter from "./app/routes";
// import { errorHandler, notFound } from "./app/middlewares/error.middleware";

// const app: Application = express();

// // Security
// app.use(helmet()); // Secure HTTP headers

// // CORS: allow frontend URL(s) or all in development
// const rawOrigins = process.env.CORS_ORIGINS || process.env.FRONTEND_URL || "http://localhost:5173,https://ride-booking-client-bay.vercel.app";
// const allowedOrigins = rawOrigins.split(",").map(s => s.trim()).filter(Boolean);

// app.use(cors({
//   origin: (origin, callback) => {
//     // allow non-browser requests like Postman (no origin)
//     if (!origin) return callback(null, true);
//     if (allowedOrigins.includes(origin)) return callback(null, true);
//     return callback(new Error("Not allowed by CORS"));
//   },
//   credentials: true,
//   optionsSuccessStatus: 200,
// }));
// // Rate Limiting
// const limiter = rateLimit({
//   windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || "900000"), // 15 minutes
//   max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || "100"),
//   message: { error: "Too many requests from this IP, try again later." },
// });
// app.use("/api", limiter);

// // Logging
// if (process.env.NODE_ENV === "development") {
//   app.use(morgan("dev"));
// }

// // Body Parsers
// app.use(express.json({ limit: "10mb" }));
// app.use(express.urlencoded({ extended: true }));

// // Handle malformed JSON body errors from express.json
// app.use((err: any, req: Request, res: Response, next: any) => {
//   // If body parser failed due to empty JSON input (common when a client sets
//   // Content-Type: application/json but sends no body), allow safe methods to
//   // continue with an empty body instead of returning a 400. This prevents
//   // clients from receiving an empty/non-JSON response that causes
//   // `Unexpected end of JSON input` on the client side.
//   const isEntityParseFailed = err && err.type === "entity.parse.failed";
//   const isSyntaxError = err instanceof SyntaxError && "body" in err;

//   const isEmptyBodyError = (err && typeof err.message === "string" && /Unexpected end of JSON input/i.test(err.message));
//   const safeMethods = ["GET", "HEAD", "DELETE"];

//   if ((isEntityParseFailed || isSyntaxError) && isEmptyBodyError && safeMethods.includes(req.method)) {
//     // treat as empty body and continue
//     (req as any).body = {};
//     return next();
//   }

//   if (isEntityParseFailed) {
//     // body-parser style error
//     return res.status(400).json({
//       success: false,
//       message: "Malformed JSON body",
//       errors: err.message,
//       timestamp: new Date().toISOString(),
//     });
//   }

//   if (isSyntaxError) {
//     return res.status(400).json({
//       success: false,
//       message: "Invalid JSON payload",
//       errors: err.message,
//       timestamp: new Date().toISOString(),
//     });
//   }

//   next(err);
// });

// // Routes
// app.get("/", (_req: Request, res: Response) => {
//   res.json({ message: "🚖 Ride Booking API root route working!" });
// });

// app.get("/health", (_req: Request, res: Response) => {
//   res.status(200).json({
//     success: true,
//     message: "Ride Booking API is running successfully",
//     timestamp: new Date().toISOString(),
//     environment: process.env.NODE_ENV || "development",
//   });
// });

// app.use("/api/v1", apiRouter);

// // Error Handling
// app.use(notFound); // 404 middleware
// app.use(errorHandler); // Global error handler

// export default app;
import express, { Application, Request, Response, NextFunction } from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import rateLimit from "express-rate-limit";
import apiRouter from "./app/routes";
import { errorHandler, notFound } from "./app/middlewares/error.middleware";

const app: Application = express();

/* ---------------- Security Middlewares ---------------- */
app.use(helmet()); // Secure HTTP headers

/* ---------------- CORS Configuration ---------------- */
// Allowed origins can be provided as comma-separated env var (CORS_ORIGINS) or single FRONTEND_URL
const rawOrigins =
  process.env.CORS_ORIGINS ||
  process.env.FRONTEND_URL ||
  "http://localhost:5173,https://ride-booking-client-bay.vercel.app";

const allowedOrigins = rawOrigins
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean);

/**
 * origin callback: allow requests with no origin (Postman/server-to-server),
 * allow when origin exactly matches allowedOrigins otherwise reject.
 */
const corsOptions = {
  origin: (origin: any, callback: (err: Error | null, allow?: boolean) => void) => {
    if (!origin) return callback(null, true); // allow non-browser requests
    if (allowedOrigins.includes(origin)) return callback(null, true);
    console.warn("❌ CORS blocked origin:", origin);
    return callback(new Error("Not allowed by CORS"));
  },
  credentials: true,
  optionsSuccessStatus: 200,
};

app.use(cors(corsOptions));
// Ensure preflight (OPTIONS) is handled for all routes
app.options("*", cors(corsOptions));

/* ---------------- Rate Limiting ---------------- */
const limiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || "900000", 10), // default 15 min
  max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || "100", 10), // default 100 requests per window
  message: { success: false, message: "Too many requests from this IP, try again later." },
});
app.use("/api", limiter);

/* ---------------- Logging ---------------- */
if (process.env.NODE_ENV === "development") {
  app.use(morgan("dev"));
}

/* ---------------- Body Parsers ---------------- */
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true }));

/* ---------------- Handle malformed JSON ---------------- */
app.use((err: any, req: Request, res: Response, next: NextFunction) => {
  const isEntityParseFailed = err && err.type === "entity.parse.failed";
  const isSyntaxError = err instanceof SyntaxError && "body" in err;
  const isEmptyBodyError =
    err && typeof err.message === "string" && /Unexpected end of JSON input/i.test(err.message);
  const safeMethods = ["GET", "HEAD", "DELETE"];

  if ((isEntityParseFailed || isSyntaxError) && isEmptyBodyError && safeMethods.includes(req.method)) {
    (req as any).body = {};
    return next();
  }

  if (isEntityParseFailed || isSyntaxError) {
    return res.status(400).json({
      success: false,
      message: "Invalid or malformed JSON payload",
      error: err.message,
      timestamp: new Date().toISOString(),
    });
  }

  return next(err);
});

/* ---------------- Base Routes ---------------- */
app.get("/", (_req: Request, res: Response) => {
  res.json({
    success: true,
    message: "🚖 Ride Booking API root route working!",
  });
});

app.get("/health", (_req: Request, res: Response) => {
  res.status(200).json({
    success: true,
    message: "Ride Booking API is running successfully",
    environment: process.env.NODE_ENV || "development",
    timestamp: new Date().toISOString(),
  });
});

/* ---------------- Main API Routes ---------------- */
app.use("/api/v1", apiRouter);

/* ---------------- Error Handling ---------------- */
app.use(notFound);
app.use(errorHandler);

export default app;