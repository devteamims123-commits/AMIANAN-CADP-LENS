import { supabaseAdmin } from "../config/supabase.js";

const ALLOWED_STATUSES = [
  "active",
  "resolved",
  "for_monitoring",
];

function cleanText(value) {
  return typeof value === "string"
    ? value.trim()
    : "";
}

function normalizeChecklist(checklist = {}) {
  return {
    activities_reviewed:
      checklist.activities_reviewed === true,

    testing_completed:
      checklist.testing_completed === true,

    backups_completed:
      checklist.backups_completed === true,

    users_informed:
      checklist.users_informed === true,

    documentation_updated:
      checklist.documentation_updated === true,
  };
}

function hasChecklistSelection(checklist) {
  return Object.values(checklist).some(Boolean);
}

function isValidProofLink(value) {
  if (!value) return true;

  try {
    const url = new URL(value);

    return (
      url.protocol === "http:" ||
      url.protocol === "https:"
    );
  } catch {
    return false;
  }
}

function validateMaintenanceRecord(body) {
  const maintenanceDate = cleanText(
    body.maintenance_date
  );

  const status = cleanText(
    body.status
  ).toLowerCase();

  const issue = cleanText(body.issue);

  const actionTaken = cleanText(
    body.action_taken
  );

  const personsResponsible = cleanText(
    body.persons_responsible
  );

  const proofLink = cleanText(
    body.proof_link
  );

  const checklist = normalizeChecklist(
    body.checklist
  );

  if (!maintenanceDate) {
    return "Maintenance date is required.";
  }

  if (!ALLOWED_STATUSES.includes(status)) {
    return "Please select a valid maintenance status.";
  }

  if (!issue) {
    return "Issue is required.";
  }

  if (!actionTaken) {
    return "Action Taken is required.";
  }

  if (!personsResponsible) {
    return "At least one person responsible is required.";
  }

  if (!hasChecklistSelection(checklist)) {
    return "Select at least one maintenance checklist item.";
  }

  if (!isValidProofLink(proofLink)) {
    return "Please enter a valid proof or reference link.";
  }

  return null;
}

// ======================================================
// GET
// ======================================================

export async function listMaintenanceLogs(req, res) {
  try {
    const { data, error } = await supabaseAdmin
      .from("maintenance_records")
      .select(`
        id,
        maintenance_date,
        status,
        issue,
        action_taken,
        downtime,
        persons_responsible,
        observation_result,
        action_needed,
        checklist,
        proof_link,
        created_by,
        created_at,
        updated_at
      `)
      .order("maintenance_date", {
        ascending: false,
      })
      .order("created_at", {
        ascending: false,
      });

    if (error) {
      throw error;
    }

    return res.status(200).json({
      success: true,
      logs: data || [],
    });
  } catch (error) {
    console.error(
      "Load maintenance records error:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        error.message ||
        "Unable to load maintenance records.",
    });
  }
}

// ======================================================
// CREATE
// ======================================================

export async function createMaintenanceLog(req, res) {
  try {
    const validationError =
      validateMaintenanceRecord(req.body);

    if (validationError) {
      return res.status(400).json({
        success: false,
        message: validationError,
      });
    }

    const record = {
      maintenance_date: cleanText(
        req.body.maintenance_date
      ),

      status: cleanText(
        req.body.status
      ).toLowerCase(),

      issue: cleanText(req.body.issue),

      action_taken: cleanText(
        req.body.action_taken
      ),

      downtime:
        cleanText(req.body.downtime) || null,

      persons_responsible: cleanText(
        req.body.persons_responsible
      ),

      observation_result:
        cleanText(
          req.body.observation_result
        ) || null,

      action_needed:
        cleanText(
          req.body.action_needed
        ) || null,

      checklist: normalizeChecklist(
        req.body.checklist
      ),

      proof_link:
        cleanText(req.body.proof_link) || null,

      created_by:
        req.authUser?.id || null,
    };

    const { data, error } = await supabaseAdmin
      .from("maintenance_records")
      .insert(record)
      .select()
      .single();

    if (error) {
      throw error;
    }

    return res.status(201).json({
      success: true,
      message:
        "Maintenance record created successfully.",
      log: data,
    });
  } catch (error) {
    console.error(
      "Create maintenance record error:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        error.message ||
        "Unable to create maintenance record.",
    });
  }
}

// ======================================================
// UPDATE
// ======================================================

export async function updateMaintenanceLog(req, res) {
  try {
    const { id } = req.params;

    if (!id) {
      return res.status(400).json({
        success: false,
        message:
          "Maintenance record ID is required.",
      });
    }

    const validationError =
      validateMaintenanceRecord(req.body);

    if (validationError) {
      return res.status(400).json({
        success: false,
        message: validationError,
      });
    }

    const updates = {
      maintenance_date: cleanText(
        req.body.maintenance_date
      ),

      status: cleanText(
        req.body.status
      ).toLowerCase(),

      issue: cleanText(req.body.issue),

      action_taken: cleanText(
        req.body.action_taken
      ),

      downtime:
        cleanText(req.body.downtime) || null,

      persons_responsible: cleanText(
        req.body.persons_responsible
      ),

      observation_result:
        cleanText(
          req.body.observation_result
        ) || null,

      action_needed:
        cleanText(
          req.body.action_needed
        ) || null,

      checklist: normalizeChecklist(
        req.body.checklist
      ),

      proof_link:
        cleanText(req.body.proof_link) || null,
    };

    const { data, error } = await supabaseAdmin
      .from("maintenance_records")
      .update(updates)
      .eq("id", id)
      .select()
      .single();

    if (error) {
      throw error;
    }

    return res.status(200).json({
      success: true,
      message:
        "Maintenance record updated successfully.",
      log: data,
    });
  } catch (error) {
    console.error(
      "Update maintenance record error:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        error.message ||
        "Unable to update maintenance record.",
    });
  }
}

// ======================================================
// DELETE
// ======================================================

export async function deleteMaintenanceLog(req, res) {
  try {
    const { id } = req.params;

    if (!id) {
      return res.status(400).json({
        success: false,
        message:
          "Maintenance record ID is required.",
      });
    }

    const {
      data: existingRecord,
      error: findError,
    } = await supabaseAdmin
      .from("maintenance_records")
      .select("id")
      .eq("id", id)
      .maybeSingle();

    if (findError) {
      throw findError;
    }

    if (!existingRecord) {
      return res.status(404).json({
        success: false,
        message:
          "Maintenance record not found.",
      });
    }

    const { error } = await supabaseAdmin
      .from("maintenance_records")
      .delete()
      .eq("id", id);

    if (error) {
      throw error;
    }

    return res.status(200).json({
      success: true,
      message:
        "Maintenance record deleted successfully.",
    });
  } catch (error) {
    console.error(
      "Delete maintenance record error:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        error.message ||
        "Unable to delete maintenance record.",
    });
  }
}