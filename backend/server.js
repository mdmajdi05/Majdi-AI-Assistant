import express from "express";
import dotenv from "dotenv";
import path from "path";
import cors from "cors";
import majdiRoutes from "./routes/majdiRoutes.js";

dotenv.config();
const app = express();
const PORT = process.env.PORT || 5000;

app.use(express.json());

// CORS for frontend (Next.js) from .env configuration
const allowedOrigins = process.env.CORS_ORIGINS.split(/\s*,\s*/);
app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin) return callback(null, true);
      if (allowedOrigins.includes(origin) || allowedOrigins.includes("*")) return callback(null, true);
      return callback(null, true);
    },
    credentials: false,
  })
);

// Serve output folder as static /static
app.use("/static", express.static(path.join(process.cwd(), "output")));

// API routes
app.use("/api/majdi", majdiRoutes);

app.listen(PORT, () => {
  console.log(`Majdi AI backend running on port ${PORT}`);
});
