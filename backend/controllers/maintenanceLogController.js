import { supabaseAdmin } from "../config/supabase.js";

export async function listMaintenanceLogs(req, res) {
  try {
    const { data, error } = await supabaseAdmin
      .from("maintenance_logs")
      .select("id, activity, module, details, performed_by_name, performed_by_role, status, created_at")
      .order("created_at", { ascending: false })
      .limit(1000);

    if (error) throw error;
    res.json({ success: true, logs: data || [] });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message || "Unable to load maintenance logs." });
  }
}
