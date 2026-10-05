import { supabaseAdmin } from "../config/supabase.js";

export async function requireAdminOrSuperAdmin(req, res, next) {
  try {
    const authHeader = req.headers.authorization || "";
    const token = authHeader.startsWith("Bearer ")
      ? authHeader.slice(7)
      : null;

    if (!token) {
      return res.status(401).json({
        success: false,
        message: "Missing authentication token.",
      });
    }

    const {
      data: { user },
      error: userError,
    } = await supabaseAdmin.auth.getUser(token);

    if (userError || !user) {
      return res.status(401).json({
        success: false,
        message: "Invalid or expired session.",
      });
    }

    const { data: profile, error: profileError } = await supabaseAdmin
      .from("profiles")
      .select("id, full_name, username, email, role")
      .eq("id", user.id)
      .single();

    if (
      profileError ||
      !profile ||
      !["super_admin", "admin"].includes(profile.role)
    ) {
      return res.status(403).json({
        success: false,
        message: "Super Admin or Admin access is required.",
      });
    }

    req.authUser = user;
    req.authProfile = profile;

    next();
  } catch (error) {
    console.error("Admin authorization error:", error);

    return res.status(500).json({
      success: false,
      message: "Unable to verify access.",
    });
  }
}