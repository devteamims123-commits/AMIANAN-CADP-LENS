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
// Password recovery
// Respond identically whether an account exists or not.
// Never expose the service-role key to the frontend.
// ======================================================

const recoveryMessage =
  "If this email belongs to an account, password reset instructions will be sent.";

// Basic best-effort throttle. For production with multiple instances,
// replace this in-memory store with a shared Redis/database rate limiter.
const recoveryAttempts = new Map();
const RECOVERY_COOLDOWN_MS = 60_000;

app.post("/api/auth/forgot-password", async (req, res) => {
  const email = String(req.body?.email ?? "").trim().toLowerCase();
  const validEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

  if (!validEmail || email.length > 254) {
    return res.status(400).json({
      success: false,
      message: "Enter a valid email address.",
    });
  }

  const ip = req.ip || "unknown";
  const key = `${ip}:${email}`;
  const now = Date.now();
  const previous = recoveryAttempts.get(key) ?? 0;

  if (now - previous < RECOVERY_COOLDOWN_MS) {
    return res.status(429).json({
      success: false,
      message: "Please wait a minute before requesting another reset link.",
    });
  }
  recoveryAttempts.set(key, now);

  // Opportunistically remove stale entries to limit memory growth.
  if (recoveryAttempts.size > 1000) {
    for (const [attemptKey, timestamp] of recoveryAttempts) {
      if (now - timestamp > RECOVERY_COOLDOWN_MS) {
        recoveryAttempts.delete(attemptKey);
      }
    }
  }

  try {
    // Search Auth users, not just profiles: profiles may be missing or stale.
    // Supabase Admin listUsers is paginated.
    let exists = false;
    let page = 1;
    const perPage = 1000;

    while (true) {
      const { data, error } = await supabaseAdmin.auth.admin.listUsers({
        page,
        perPage,
      });
      if (error) throw error;

      const users = data?.users ?? [];
      exists = users.some(
        (user) => user.email?.trim().toLowerCase() === email
      );
      if (exists || users.length < perPage) break;
      page += 1;
    }

    if (exists) {
      const configuredOrigin =
        process.env.FRONTEND_URL || "http://localhost:5173";
      const redirectTo = `${configuredOrigin.replace(/\/$/, "")}/reset-password`;

      const { error } = await supabaseAdmin.auth.resetPasswordForEmail(email, {
        redirectTo,
      });
      if (error) throw error;
    }

    return res.status(200).json({
      success: true,
      message: recoveryMessage,
    });
  } catch (error) {
    console.error("Password recovery error:", error);
    // Do not disclose account existence or internal Supabase errors.
    return res.status(200).json({
      success: true,
      message: recoveryMessage,
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