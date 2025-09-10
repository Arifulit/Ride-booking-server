import mongoose from "mongoose";
import dotenv from "dotenv";
import app from "./app";

// Load environment variables from .env file
dotenv.config();

// Server and Database configuration
const PORT = process.env.PORT ? Number(process.env.PORT) : 5000; // Server port
const MONGO_URI = process.env.MONGODB_URI as string;             // MongoDB connection string

// Database connection
const connectDB = async (): Promise<void> => {
  try {
    const conn = await mongoose.connect(MONGO_URI); // Connect to MongoDB
    console.log(`MongoDB Connected: ${conn.connection.host}`);
  } catch (error: any) {
    console.error("Database connection failed:", error.message);
    process.exit(1); // Exit process if DB connection fails
  }
};

// Connect to the database
connectDB();

// Start Express server
const server = app.listen(PORT, () => {
  console.log(`Server running on port ${PORT} in ${process.env.NODE_ENV || "production"} mode`);
  console.log(`API Base URL: http://localhost:${PORT}/api/v1`);
});

// Handle unhandled promise rejections
process.on("unhandledRejection", (err: any) => {
  console.error("Unhandled Promise Rejection:", err?.message || err);
  server.close(() => process.exit(1));
});

// Handle uncaught exceptions
process.on("uncaughtException", (err: any) => {
  console.error("Uncaught Exception:", err?.message || err);
  process.exit(1);
});

export default server;
