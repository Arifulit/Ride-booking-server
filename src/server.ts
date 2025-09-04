import dotenv from "dotenv";
import app from "./app";
import connectDB from "./app/config/database";

dotenv.config();

const PORT = process.env.PORT ? Number(process.env.PORT) : 5000;

// Connect to MongoDB
connectDB();

// Start server
const server = app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT} in ${process.env.NODE_ENV} mode`);
  console.log(`📍 API Base URL: http://localhost:${PORT}/api/v1`);
});

// Handle unhandled promise rejections
process.on("unhandledRejection", (err: any) => {
  console.error("Unhandled Promise Rejection:", err?.message || err);
  server.close(() => {
    process.exit(1);
  });
});

// Handle uncaught exceptions
process.on("uncaughtException", (err: any) => {
  console.error("Uncaught Exception:", err?.message || err);
  process.exit(1);
});

export default server;