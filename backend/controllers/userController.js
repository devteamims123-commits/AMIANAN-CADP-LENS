import { supabaseAdmin } from "../config/supabase.js";

const ALLOWED_ROLES = ["admin", "user", "viewer"];
const clean = (value) => typeof value === "string" ? value.trim() : "";

async function usernameExists(username, excludeId = null) {
  let query = supabaseAdmin.from("profiles").select("id").ilike("username", username);
  if (excludeId) query = query.neq("id", excludeId);
  const { data, error } = await query.limit(1);
  if (error) throw error;
  return Boolean(data?.length);
}

export async function listUsers(req, res) {
  try {
    const { data, error } = await supabaseAdmin
      .from("profiles")
      .select("id, full_name, username, email, role, created_at, updated_at")
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
        user_metadata: { full_name: fullName, username },
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
        updated_at: new Date().toISOString(),
      }, { onConflict: "id" });

    if (profileError) throw profileError;

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
      user_metadata: { full_name: fullName, username },
    });
    if (authError) throw authError;

    const { error: profileError } = await supabaseAdmin
      .from("profiles")
      .update({
        full_name: fullName,
        username,
        email,
        role,
        updated_at: new Date().toISOString(),
      })
      .eq("id", id);
    if (profileError) throw profileError;

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
      .select("role")
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

    res.json({ success: true, message: "Account deleted successfully." });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message || "Unable to delete account." });
  }
}
