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
    let actorOrganization = null;
    let actorOrganizationType = null;

    if (userId) {
      const { data: profile } = await supabaseAdmin
        .from("profiles")
        .select("full_name, role, organization, organization_type")
        .eq("id", userId)
        .maybeSingle();

      actorName = profile?.full_name || actorName;
      actorRole = profile?.role || actorRole;
      actorOrganization = profile?.organization || null;
      actorOrganizationType = profile?.organization_type || null;
    }

    const { error } = await supabaseAdmin.from("maintenance_logs").insert({
      activity,
      module,
      details,
      performed_by: userId || null,
      performed_by_name: actorName,
      performed_by_role: actorRole,
      performed_by_organization: actorOrganization,
      performed_by_organization_type: actorOrganizationType,
      status,
    });

    if (error) console.error("Unable to write maintenance log:", error.message);
  } catch (error) {
    // Logging must never break the main operation.
    console.error("Maintenance logging error:", error.message);
  }
}
