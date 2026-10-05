import { supabaseAdmin } from "../config/supabase.js";

export async function writeMaintenanceLog({
  userId,
  activity,
  module,
  details,
  status = "success",
}) {
  try {
    let actorName = "Unknown User";
    let actorRole = "unknown";

    if (userId) {
      const { data: profile } = await supabaseAdmin
        .from("profiles")
        .select("full_name, role")
        .eq("id", userId)
        .maybeSingle();

      actorName = profile?.full_name || actorName;
      actorRole = profile?.role || actorRole;
    }

    const { error } = await supabaseAdmin.from("maintenance_logs").insert({
      activity,
      module,
      details,
      performed_by: userId || null,
      performed_by_name: actorName,
      performed_by_role: actorRole,
      status,
    });

    if (error) console.error("Unable to write maintenance log:", error.message);
  } catch (error) {
    // Logging must never break the main operation.
    console.error("Maintenance logging error:", error.message);
  }
}
