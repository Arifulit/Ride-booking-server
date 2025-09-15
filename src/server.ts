import mongoose from "mongoose";
import dotenv from "dotenv";
import app from "./app";

// Load environment variables
dotenv.config();

const PORT = process.env.PORT ? Number(process.env.PORT) : 5000;
const MONGO_URI = process.env.MONGODB_URI as string;

// Database Connection
const connectDB = async () => {
  try {
    await mongoose.connect(MONGO_URI);
  } catch (error: any) {
    console.error("Database connection failed:", error.message);
    process.exit(1);
  }
};

// Start Server
const startServer = async () => {
  await connectDB();

  const server = app.listen(PORT, () => {
    console.log(
      `Server running on port ${PORT} in ${
        process.env.NODE_ENV || "production"
      } mode`
    );
    console.log(`API Base URL: http://localhost:${PORT}/api/v1`);
    console.log("✅ MongoDB Connected successfully");
  });

  // Handle Errors
  process.on("unhandledRejection", (err: any) => {
    console.error("Unhandled Promise Rejection:", err?.message || err);
    server.close(() => process.exit(1));
  });

  process.on("uncaughtException", (err: any) => {
    console.error("Uncaught Exception:", err?.message || err);
    process.exit(1);
  });
};

startServer();
