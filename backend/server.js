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
    });
  }
});

// ======================================================
// Password Recovery
// Active and email-verified accounts only
// ======================================================

const recoveryMessage =
  "If this email belongs to an eligible account, password reset instructions will be sent.";

// Basic best-effort rate limiter.
// Use a shared database or Redis limiter for
// production environments with multiple instances.

const recoveryAttempts = new Map();
const RECOVERY_COOLDOWN_MS = 60_000;

app.post("/api/auth/forgot-password", async (req, res) => {
  const email = String(req.body?.email ?? "")
    .trim()
    .toLowerCase();

  const validEmail =
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

  if (!validEmail || email.length > 254) {
    return res.status(400).json({
      success: false,
      message: "Enter a valid email address.",
    });
  }

  // ====================================================
  // Password Recovery Rate Limiting
  // ====================================================

  const ip = req.ip || "unknown";
  const key = `${ip}:${email}`;
  const now = Date.now();

  const previous =
    recoveryAttempts.get(key) ?? 0;

  if (now - previous < RECOVERY_COOLDOWN_MS) {
    return res.status(429).json({
      success: false,
      message:
        "Please wait a minute before requesting another reset link.",
    });
  }

  recoveryAttempts.set(key, now);

  // Remove expired rate-limit entries.

  if (recoveryAttempts.size > 1000) {
    for (const [attemptKey, timestamp] of recoveryAttempts) {
      if (now - timestamp > RECOVERY_COOLDOWN_MS) {
        recoveryAttempts.delete(attemptKey);
      }
    }
  }

  // Use the same response for eligible, ineligible,
  // and nonexistent accounts to reduce account enumeration.

  const genericResponse = () =>
    res.status(200).json({
      success: true,
      message: recoveryMessage,
    });

  try {
    // ==================================================
    // Check Registered Profile
    // ==================================================

    // Escape LIKE wildcards for literal email matching.

    const safeEmail = email.replace(
      /[\\%_]/g,
      "\\$&"
    );

    const {
      data: profile,
      error: profileError,
    } = await supabaseAdmin
      .from("profiles")
      .select("id, email, account_status")
      .ilike("email", safeEmail)
      .maybeSingle();

    if (profileError) {
      throw profileError;
    }

    // Account must exist and match the requested email.

    if (
      !profile ||
      profile.email?.trim().toLowerCase() !== email
    ) {
      return genericResponse();
    }

    // ==================================================
    // Account Approval Validation
    // ==================================================

    // Block pending, approved-but-unverified,
    // rejected, and suspended accounts.

    if (profile.account_status !== "active") {
      return genericResponse();
    }

    // ==================================================
    // Supabase Authentication Validation
    // ==================================================

    const {
      data: authData,
      error: authError,
    } = await supabaseAdmin.auth.admin.getUserById(
      profile.id
    );

    if (authError) {
      if (authError.status === 404) {
        return genericResponse();
      }

      throw authError;
    }

    const authUser = authData?.user;

    const authEmail = authUser?.email
      ?.trim()
      .toLowerCase();

    if (!authUser || authEmail !== email) {
      return genericResponse();
    }

    // ==================================================
    // Email Verification Validation
    // ==================================================

    if (!authUser.email_confirmed_at) {
      return genericResponse();
    }

    // Block accounts currently banned in Supabase Auth.

    if (
      authUser.banned_until &&
      new Date(authUser.banned_until).getTime() > Date.now()
    ) {
      return genericResponse();
    }

    // ==================================================
    // Send Password Reset Email
    // ==================================================

    const configuredOrigin =
      process.env.FRONTEND_URL ||
      "http://localhost:5173";

    const redirectTo =
      `${configuredOrigin.replace(/\/+$/, "")}/reset-password`;

    const { error: resetError } =
      await supabaseAdmin.auth.resetPasswordForEmail(
        email,
        { redirectTo }
      );

    if (resetError) {
      // Keep the public response generic even if
      // the email provider rejects the request.

      console.error(
        "Password reset email error:",
        resetError.message
      );
    }

    return genericResponse();

  } catch (error) {
    console.error(
      "Password recovery error:",
      error.message
    );

    // Avoid revealing account existence through
    // different responses to recovery failures.

    return genericResponse();
  }
});

// ======================================================
// User Management
// Active and verified Super Admin only
// ======================================================

app.use("/api/users", userRoutes);

// ======================================================
// Maintenance
// Active and verified Super Admin / Admin
//
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