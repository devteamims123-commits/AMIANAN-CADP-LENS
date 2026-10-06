import express from "express";
import { supabaseAdmin } from "../config/supabase.js";

import {
  listMaintenanceLogs,
  createMaintenanceLog,
  updateMaintenanceLog,
  deleteMaintenanceLog,
} from "../controllers/maintenanceLogController.js";

const router = express.Router();

/* =========================================================
   AUTHORIZATION
   Super Admin + Admin only
========================================================= */

async function requireLogViewer(req, res, next) {
  try {
    const header =
      req.headers.authorization || "";

    const token = header.startsWith("Bearer ")
      ? header.slice(7)
      : "";

    if (!token) {
      return res.status(401).json({
        success: false,
        message: "Authentication required.",
      });
    }

    const {
      data: authData,
      error: authError,
    } = await supabaseAdmin.auth.getUser(token);

    if (
      authError ||
      !authData?.user
    ) {
      return res.status(401).json({
        success: false,
        message:
          "Invalid or expired session.",
      });
    }

    const {
      data: profile,
      error: profileError,
    } = await supabaseAdmin
      .from("profiles")
      .select(
        "id, full_name, username, role"
      )
      .eq(
        "id",
        authData.user.id
      )
      .single();

    if (profileError || !profile) {
      return res.status(403).json({
        success: false,
        message:
          "Unable to verify your account role.",
      });
    }

    if (
      ![
        "super_admin",
        "admin",
      ].includes(profile.role)
    ) {
      return res.status(403).json({
        success: false,
        message:
          "Super Admin or Admin access required.",
      });
    }

    /*
      Store authenticated account information
      so controllers can use it when creating
      or updating maintenance records.
    */

    req.authUser =
      authData.user;

    req.authProfile =
      profile;

    req.authRole =
      profile.role;

    next();
  } catch (error) {
    console.error(
      "Maintenance authorization error:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        "Unable to verify access.",
    });
  }
}

/* =========================================================
   APPLY AUTHORIZATION TO ALL ROUTES
========================================================= */

router.use(requireLogViewer);

/* =========================================================
   GET
   /api/maintenance-logs
========================================================= */

router.get(
  "/",
  listMaintenanceLogs
);

/* =========================================================
   POST
   /api/maintenance-logs
========================================================= */

router.post(
  "/",
  createMaintenanceLog
);

/* =========================================================
   PUT
   /api/maintenance-logs/:id
========================================================= */

router.put(
  "/:id",
  updateMaintenanceLog
);

/* =========================================================
   DELETE
   /api/maintenance-logs/:id
========================================================= */

router.delete(
  "/:id",
  deleteMaintenanceLog
);

export default router;