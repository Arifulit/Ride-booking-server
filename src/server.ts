// import mongoose from "mongoose";
// import dotenv from "dotenv";
// import * as appModule from "./app";
// const app = (appModule as any).default || appModule;
// import { connectRedis } from "./app/config/redis.config";

// // Load environment variables
// dotenv.config();
// const PORT = process.env.PORT ? Number(process.env.PORT) : 5000;
// const MONGO_URI = process.env.MONGODB_URI as string;

// // Database Connection
// const connectDB = async () => {
//   try {
//     await mongoose.connect(MONGO_URI);
//     console.log("✅ MongoDB Connected successfully");
//   } catch (error: any) {
//     console.error("Database connection failed:", error.message);
//     process.exit(1);
//   }
// };

// // Start Server
// const startServer = async () => {
//   try {
//     // Connect to database first
//     await connectDB();
    
//     // Seed super admin after database connection
//     // await seedAdmin();

//     const server = app.listen(PORT, () => {
//       console.log(
//         `🚀 Server running on port ${PORT} in ${
//           process.env.NODE_ENV || "production"
//         } mode`
//       );
//       console.log(`📡 API Base URL: http://localhost:${PORT}/api/v1`);
//     });

//     // Handle Errors
//     process.on("unhandledRejection", (err: any) => {
//       console.error("❌ Unhandled Promise Rejection:", err?.message || err);
//       server.close(() => process.exit(1));
//     });

//     process.on("uncaughtException", (err: any) => {
//       console.error("❌ Uncaught Exception:", err?.message || err);
//       process.exit(1);
//     });

//   } catch (error: any) {
//     console.error("❌ Failed to start server:", error.message);
//     process.exit(1);
//   }
// };

// (async () => {
//     await connectRedis();
//     await startServer();
// })();


import dotenv from "dotenv";
// load env early
dotenv.config();

import mongoose from "mongoose";
import * as appModule from "./app";
import { connectRedis } from "./app/config/redis.config";

// resolve app robustly (support default export or named export shapes)
let app: any = (appModule as any).default || appModule;
if (!app || typeof app !== "function" && typeof app.listen !== "function" && typeof app.app !== "object") {
  console.error("❌ Imported app module keys:", Object.keys(appModule || {}));
}

// Load config
const PORT = process.env.PORT ? Number(process.env.PORT) : 5000;
const MONGO_URI = process.env.MONGODB_URI as string;

// Database Connection
const connectDB = async () => {
  try {
    await mongoose.connect(MONGO_URI);
    console.log("✅ MongoDB Connected successfully");
  } catch (error: any) {
    console.error("Database connection failed:", error.message);
    process.exit(1);
  }
};

// Start Server
const startServer = async () => {
  try {
    // Connect to database first
    await connectDB();

    // ensure we have the express instance that exposes listen()
    const serverApp = app?.app || app;
    if (typeof serverApp?.listen !== "function") {
      console.error("❌ Could not find Express app (no listen() function). Module keys:", Object.keys(appModule || {}));
      throw new Error("Express app not found. Ensure src/app.ts exports the Express app as default (export default app) or adjust import.");
    }

    const server = serverApp.listen(PORT, () => {
      console.log(
        `🚀 Server running on port ${PORT} in ${process.env.NODE_ENV || "production"} mode`
      );
      console.log(`📡 API Base URL: http://localhost:${PORT}/api/v1`);
    });

    // Handle async errors
    process.on("unhandledRejection", (err: any) => {
      console.error("❌ Unhandled Promise Rejection:", err?.message || err);
      server.close(() => process.exit(1));
    });

    process.on("uncaughtException", (err: any) => {
      console.error("❌ Uncaught Exception:", err?.message || err);
      process.exit(1);
    });

  } catch (error: any) {
    console.error("❌ Failed to start server:", error.message || error);
    process.exit(1);
  }
};

(async () => {
  await connectRedis();
  await startServer();
})();