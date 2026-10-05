import { supabaseAdmin } from "../config/supabase.js";

export async function requireSuperAdmin(req, res, next) {
  try {
    const authHeader = req.headers.authorization || "";
    const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : null;

    if (!token) {
      return res.status(401).json({ success: false, message: "Missing authentication token." });
    }

    const { data: { user }, error: userError } =
      await supabaseAdmin.auth.getUser(token);

    if (userError || !user) {
      return res.status(401).json({ success: false, message: "Invalid or expired session." });
    }

    const { data: profile, error: profileError } = await supabaseAdmin
      .from("profiles")
      .select("id, role")
      .eq("id", user.id)
      .single();

    if (profileError || !profile || profile.role !== "super_admin") {
      return res.status(403).json({ success: false, message: "Super Admin access is required." });
    }

    req.authUser = user;
    next();
  } catch (error) {
    console.error("Super Admin authorization error:", error);
    res.status(500).json({ success: false, message: "Unable to verify access." });
  }
}
