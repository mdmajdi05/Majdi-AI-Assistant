// import express from "express";
// import dotenv from "dotenv";
// import path from "path";
// import cors from "cors";
// import majdiRoutes from "./routes/majdiRoutes.js";

// dotenv.config();
// const app = express();
// const PORT = process.env.PORT || 5000;

// app.use(express.json());

// // CORS for frontend (Next.js)
// app.use(
//   cors({
//     origin: process.env.CORS_ORIGINS ? process.env.CORS_ORIGINS.split(", ") : '*', // Use CORS_ORIGINS from .env or allow all if not set
//     credentials: false,
//   })
// );

// // Serve output folder as static /static
// app.use("/static", express.static(path.join(process.cwd(), "output")));

// // API routes
// app.use("/api/majdi", majdiRoutes);

// app.listen(PORT, () => {
//   console.log(`Majdi AI backend running on port ${PORT}`);
// });



import express from "express";
import dotenv from "dotenv";
import path from "path";
import cors from "cors";
import majdiRoutes from "./routes/majdiRoutes.js";

dotenv.config();
const app = express();
const PORT = process.env.PORT || 5000;

app.use(express.json());

// Enhanced CORS configuration
app.use(cors({
  origin: function (origin, callback) {
    const allowedOrigins = [
      'https://majdi-ai-assistant.netlify.app',
      'http://localhost:3000',
      'http://localhost:3001', // Add your production frontend URL
      // // Add other possible URLs
    ];
    
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);
    
    if (allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// Serve output folder as static /static
app.use("/static", express.static(path.join(process.cwd(), "output")));

// API routes
app.use("/api/majdi", majdiRoutes);

// Health check endpoint
app.get("/api/health", (req, res) => {
  res.status(200).json({ 
    status: "OK", 
    message: "Majdi AI backend is running",
    timestamp: new Date().toISOString(),
    version: "1.0.0"
  });
});

// Test endpoint
app.get("/api/test", (req, res) => {
  res.status(200).json({ 
    message: "Backend is working!", 
    timestamp: new Date().toISOString() 
  });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error("🚨 Global error handler:", err);
  res.status(500).json({ 
    error: "Internal server error",
    message: err.message 
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ 
    error: "Endpoint not found",
    message: `Route ${req.originalUrl} does not exist` 
  });
});

app.listen(PORT, () => {
  console.log(`🚀 Majdi AI backend running on port ${PORT}`);
  console.log(`🌐 Health check: http://localhost:${PORT}/api/health`);
  console.log(`🔧 Python debug: http://localhost:${PORT}/api/majdi/debug/python`);
});