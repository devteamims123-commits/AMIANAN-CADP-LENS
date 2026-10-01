import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { supabaseAdmin } from "./config/supabase.js";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(
  cors({
    origin: process.env.FRONTEND_URL || "http://localhost:5173",
    credentials: true,
  })
);

app.use(express.json());

// Home route
app.get("/", (req, res) => {
  res.json({
    success: true,
    message: "AMIANAN-CADP L.E.N.S. API is running.",
  });
});

// Supabase connection test
app.get("/api/health", async (req, res) => {
  try {
    const { error } = await supabaseAdmin.auth.admin.listUsers({
      page: 1,
      perPage: 1,
    });

    if (error) {
      throw error;
    }

    res.status(200).json({
      success: true,
      server: "connected",
      database: "connected",
      message: "Backend successfully connected to Supabase.",
    });
  } catch (error) {
    console.error("Supabase connection error:", error.message);

    res.status(500).json({
      success: false,
      server: "connected",
      database: "connection failed",
      message: "Backend could not connect to Supabase.",
      error: error.message,
    });
  }
});

// 404
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: "API route not found.",
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`AMIANAN-CADP L.E.N.S. API running on port ${PORT}`);
});