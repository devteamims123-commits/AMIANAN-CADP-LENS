import express from "express";
import cors from "cors";
import dotenv from "dotenv";

import { supabaseAdmin } from "./config/supabase.js";

import userRoutes from "./routes/userRoutes.js";
import maintenanceLogRoutes from "./routes/maintenanceLogRoutes.js";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// ======================================================
// Middleware
// ======================================================

app.use(
  cors({
    origin:
      process.env.FRONTEND_URL ||
      "http://localhost:5173",
    credentials: true,
  })
);

app.use(express.json());

// ======================================================
// Home Route
// ======================================================

app.get("/", (req, res) => {
  res.json({
    success: true,
    message:
      "AMIANAN-CADP L.E.N.S. API is running.",
  });
});

// ======================================================
// Supabase Connection Test
// ======================================================

app.get("/api/health", async (req, res) => {
  try {
    const { error } =
      await supabaseAdmin.auth.admin.listUsers({
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
      message:
        "Backend successfully connected to Supabase.",
    });
  } catch (error) {
    console.error(
      "Supabase connection error:",
      error.message
    );

    res.status(500).json({
      success: false,
      server: "connected",
      database: "connection failed",
      message:
        "Backend could not connect to Supabase.",
      error: error.message,
    });
  }
});

// ======================================================
// User Management
// Super Admin only
// ======================================================

app.use("/api/users", userRoutes);

// ======================================================
// Maintenance
// Super Admin / Admin
//
// This now handles the NEW manual maintenance records.
// GET    /api/maintenance-logs
// POST   /api/maintenance-logs
// PUT    /api/maintenance-logs/:id
// DELETE /api/maintenance-logs/:id
// ======================================================

app.use(
  "/api/maintenance-logs",
  maintenanceLogRoutes
);

// ======================================================
// 404
// Keep AFTER all API routes
// ======================================================

app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: "API route not found.",
  });
});

// ======================================================
// Start Server
// ======================================================

app.listen(PORT, () => {
  console.log(
    `AMIANAN-CADP L.E.N.S. API running on port ${PORT}`
  );
});