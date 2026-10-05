import express from "express";
import { supabaseAdmin } from "../config/supabase.js";
import { listMaintenanceLogs } from "../controllers/maintenanceLogController.js";

const router = express.Router();

async function requireLogViewer(req, res, next) {
  try {
    const header = req.headers.authorization || "";
    const token = header.startsWith("Bearer ") ? header.slice(7) : "";
    if (!token) return res.status(401).json({ success: false, message: "Authentication required." });

    const { data: authData, error: authError } = await supabaseAdmin.auth.getUser(token);
    if (authError || !authData?.user) {
      return res.status(401).json({ success: false, message: "Invalid or expired session." });
    }

    const { data: profile, error: profileError } = await supabaseAdmin
      .from("profiles")
      .select("role")
      .eq("id", authData.user.id)
      .single();

    if (profileError || !["super_admin", "admin"].includes(profile?.role)) {
      return res.status(403).json({ success: false, message: "Super Admin or Admin access required." });
    }

    req.authUser = authData.user;
    req.authRole = profile.role;
    next();
  } catch (error) {
    res.status(500).json({ success: false, message: "Unable to verify access." });
  }
}

router.get("/", requireLogViewer, listMaintenanceLogs);

export default router;
