import { supabaseAdmin } from "../config/supabase.js";
import { writeMaintenanceLog } from "../services/maintenanceLogService.js";

const ALLOWED_ROLES = ["admin", "user", "viewer"];
const clean = (value) => typeof value === "string" ? value.trim() : "";

async function usernameExists(username, excludeId = null) {
  let query = supabaseAdmin.from("profiles").select("id").ilike("username", username);
  if (excludeId) query = query.neq("id", excludeId);
  const { data, error } = await query.limit(1);
  if (error) throw error;
  return Boolean(data?.length);
}

async function resolveOrganization(organizationType, organizationId) {
  const type = clean(organizationType);
  const id = clean(organizationId);
  if (!type && !id) return { organization: null, organization_type: null, agency_lgu_id: null };
  if (!id || !["Agency", "LGU"].includes(type)) {
    throw new Error("Select a valid organization type and registered Agency / LGU.");
  }
  const { data, error } = await supabaseAdmin.from("agencies_lgus")
    .select("id, name, organization_type").eq("id", id).eq("organization_type", type).maybeSingle();
  if (error) throw error;
  if (!data) throw new Error("The selected Agency / LGU is not registered.");
  return { organization: data.name, organization_type: data.organization_type, agency_lgu_id: data.id };
}

export async function listUsers(req, res) {
  try {
    const { data, error } = await supabaseAdmin
      .from("profiles")
      .select("id, full_name, username, email, role, organization, organization_type, agency_lgu_id, created_at, updated_at")
      .order("created_at", { ascending: false });
    if (error) throw error;

    res.json({ success: true, users: data || [], currentUserId: req.authUser.id });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message || "Unable to load users." });
  }
}

export async function createUser(req, res) {
  let createdUserId = null;

  try {
    const fullName = clean(req.body.fullName);
    const username = clean(req.body.username);
    const email = clean(req.body.email).toLowerCase();
    const password = req.body.password || "";
    const role = clean(req.body.role);
    const organizationFields = await resolveOrganization(req.body.organizationType, req.body.organizationId);

    if (!fullName || !username || !email || !password || !role) {
      return res.status(400).json({ success: false, message: "All fields are required." });
    }
    if (password.length < 6) {
      return res.status(400).json({ success: false, message: "Password must contain at least 6 characters." });
    }
    if (!ALLOWED_ROLES.includes(role)) {
      return res.status(400).json({ success: false, message: "Role must be Admin, User, or Viewer." });
    }
    if (await usernameExists(username)) {
      return res.status(409).json({ success: false, message: "Username is already in use." });
    }

    const { data: authData, error: authError } =
      await supabaseAdmin.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: { full_name: fullName, username, ...organizationFields },
      });

    if (authError) throw authError;
    createdUserId = authData.user.id;

    const { error: profileError } = await supabaseAdmin
      .from("profiles")
      .upsert({
        id: createdUserId,
        full_name: fullName,
        username,
        email,
        role,
        ...organizationFields,
        updated_at: new Date().toISOString(),
      }, { onConflict: "id" });

    if (profileError) throw profileError;

    await writeMaintenanceLog({
      userId: req.authUser.id,
      activity: "Account Created",
      module: "User Management",
      details: `Created ${role} account for ${fullName} (${username}).`,
    });

    res.status(201).json({ success: true, message: "Account created successfully." });
  } catch (error) {
    if (createdUserId) {
      try { await supabaseAdmin.auth.admin.deleteUser(createdUserId); } catch {}
    }
    res.status(400).json({ success: false, message: error.message || "Unable to create account." });
  }
}

export async function updateUser(req, res) {
  try {
    const { id } = req.params;
    const fullName = clean(req.body.fullName);
    const username = clean(req.body.username);
    const email = clean(req.body.email).toLowerCase();
    const role = clean(req.body.role);
    const organizationFields = ("organizationType" in req.body || "organizationId" in req.body)
      ? await resolveOrganization(req.body.organizationType, req.body.organizationId) : null;

    if (!fullName || !username || !email || !role) {
      return res.status(400).json({ success: false, message: "All fields are required." });
    }
    if (id === req.authUser.id && role !== "super_admin") {
      return res.status(400).json({ success: false, message: "You cannot change your own Super Admin role." });
    }
    if (id !== req.authUser.id && !ALLOWED_ROLES.includes(role)) {
      return res.status(400).json({ success: false, message: "Role must be Admin, User, or Viewer." });
    }
    if (await usernameExists(username, id)) {
      return res.status(409).json({ success: false, message: "Username is already in use." });
    }

    const { error: authError } = await supabaseAdmin.auth.admin.updateUserById(id, {
      email,
      user_metadata: { full_name: fullName, username, ...(organizationFields || {}) },
    });
    if (authError) throw authError;

    const { error: profileError } = await supabaseAdmin
      .from("profiles")
      .update({
        full_name: fullName,
        username,
        email,
        role,
        ...(organizationFields || {}),
        updated_at: new Date().toISOString(),
      })
      .eq("id", id);
    if (profileError) throw profileError;

    await writeMaintenanceLog({
      userId: req.authUser.id,
      activity: "Account Updated",
      module: "User Management",
      details: `Updated account for ${fullName} (${username}); role: ${role}.`,
    });

    res.json({ success: true, message: "Account updated successfully." });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message || "Unable to update account." });
  }
}

export async function deleteUser(req, res) {
  try {
    const { id } = req.params;

    if (id === req.authUser.id) {
      return res.status(400).json({ success: false, message: "You cannot delete your own Super Admin account." });
    }

    const { data: target, error: lookupError } = await supabaseAdmin
      .from("profiles")
      .select("full_name, username, role")
      .eq("id", id)
      .single();

    if (lookupError || !target) {
      return res.status(404).json({ success: false, message: "Account not found." });
    }
    if (target.role === "super_admin") {
      return res.status(403).json({ success: false, message: "Super Admin accounts are protected." });
    }

    const { error } = await supabaseAdmin.auth.admin.deleteUser(id);
    if (error) throw error;

    await writeMaintenanceLog({
      userId: req.authUser.id,
      activity: "Account Deleted",
      module: "User Management",
      details: `Deleted ${target.role} account for ${target.full_name || target.username || id}.`,
    });

    res.json({ success: true, message: "Account deleted successfully." });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message || "Unable to delete account." });
  }
}
