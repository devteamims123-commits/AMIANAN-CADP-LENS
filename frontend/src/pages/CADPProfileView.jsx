import { useCallback, useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "../services/supabase";
import "./CADPProfile.css";

const emptyForm = {
  convergence_type: "CADP",
  region: "Region I (Ilocos Region)",
  provinces_covered: "",
  cities_municipalities_covered: "",
  barangays_covered: "",
  watershed_major_river: "",
  status: "",
  priority_commodities: "",
  end_year: "",
  vision: "",
  mission: "",
  goals: "",
  objectives: "",
  brief_description: "",
  aff_enterprises: "",
  csos: "",
  flora_status: "",
  fauna_status: "",
};

function CADPProfileView() {
  const { siteId } = useParams();
  const navigate = useNavigate();

  const [site, setSite] = useState(null);
  const [profile, setProfile] = useState(null);
  const [form, setForm] = useState(emptyForm);

  const [role, setRole] = useState("");
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);

  const [message, setMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  const canEdit =
    role === "super_admin" || role === "admin";

  const loadProfile = useCallback(async () => {
    setLoading(true);
    setErrorMessage("");

    try {
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError || !user) {
        throw new Error("Your session is unavailable.");
      }

      const { data: userProfile, error: userProfileError } =
        await supabase
          .from("profiles")
          .select("role")
          .eq("id", user.id)
          .single();

      if (userProfileError) throw userProfileError;

      setRole(userProfile?.role || "");

      const { data: siteData, error: siteError } =
        await supabase
          .from("cadp_sites")
          .select(`
            id,
            province,
            municipality_city,
            barangay,
            year_started,
            convergence_name
          `)
          .eq("id", siteId)
          .single();

      if (siteError) throw siteError;

      setSite(siteData);

      const { data: profileData, error: profileError } =
        await supabase
          .from("cadp_profiles")
          .select("*")
          .eq("cadp_site_id", siteId)
          .maybeSingle();

      if (profileError) throw profileError;

      setProfile(profileData || null);

      setForm({
        ...emptyForm,

        provinces_covered:
          profileData?.provinces_covered ||
          siteData.province ||
          "",

        cities_municipalities_covered:
          profileData?.cities_municipalities_covered ||
          siteData.municipality_city ||
          "",

        barangays_covered:
          profileData?.barangays_covered ||
          siteData.barangay ||
          "",

        convergence_type:
          profileData?.convergence_type || "CADP",

        region:
          profileData?.region ||
          "Region I (Ilocos Region)",

        watershed_major_river:
          profileData?.watershed_major_river || "",

        status:
          profileData?.status || "",

        priority_commodities:
          profileData?.priority_commodities || "",

        end_year:
          profileData?.end_year
            ? String(profileData.end_year)
            : "",

        vision:
          profileData?.vision || "",

        mission:
          profileData?.mission || "",

        goals:
          profileData?.goals || "",

        objectives:
          profileData?.objectives || "",

        brief_description:
          profileData?.brief_description || "",

        aff_enterprises:
          profileData?.aff_enterprises || "",

        csos:
          profileData?.csos || "",

        flora_status:
          profileData?.flora_status || "",

        fauna_status:
          profileData?.fauna_status || "",
      });
    } catch (error) {
      console.error(error);

      setErrorMessage(
        error.message || "Unable to load CADP profile."
      );
    } finally {
      setLoading(false);
    }
  }, [siteId]);

  useEffect(() => {
    loadProfile();
  }, [loadProfile]);

  const update = (field, value) => {
    setForm((current) => ({
      ...current,
      [field]: value,
    }));
  };

  const handleSave = async () => {
    if (!canEdit) return;

    setSaving(true);
    setErrorMessage("");
    setMessage("");

    try {
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError || !user) {
        throw new Error("Your session is unavailable.");
      }

      const payload = {
        cadp_site_id: siteId,

        convergence_type:
          form.convergence_type.trim() || "CADP",

        region:
          form.region.trim() ||
          "Region I (Ilocos Region)",

        provinces_covered:
          form.provinces_covered.trim(),

        cities_municipalities_covered:
          form.cities_municipalities_covered.trim(),

        barangays_covered:
          form.barangays_covered.trim(),

        watershed_major_river:
          form.watershed_major_river.trim(),

        status:
          form.status.trim(),

        priority_commodities:
          form.priority_commodities.trim(),

        end_year:
          form.end_year
            ? Number(form.end_year)
            : null,

        vision: form.vision.trim(),
        mission: form.mission.trim(),
        goals: form.goals.trim(),
        objectives: form.objectives.trim(),

        brief_description:
          form.brief_description.trim(),

        aff_enterprises:
          form.aff_enterprises.trim(),

        csos: form.csos.trim(),

        flora_status:
          form.flora_status.trim(),

        fauna_status:
          form.fauna_status.trim(),

        updated_at: new Date().toISOString(),
      };

      if (profile) {
        const { error } = await supabase
          .from("cadp_profiles")
          .update(payload)
          .eq("id", profile.id);

        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("cadp_profiles")
          .insert({
            ...payload,
            created_by: user.id,
          });

        if (error) throw error;
      }

      setMessage("CADP profile saved successfully.");
      setEditing(false);

      await loadProfile();
    } catch (error) {
      console.error(error);

      setErrorMessage(
        error.message || "Unable to save CADP profile."
      );
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="profile-page">
        <div className="profile-loading">
          Loading CADP profile...
        </div>
      </div>
    );
  }

  if (!site) {
    return (
      <div className="profile-page">
        <div className="profile-loading">
          CADP site not found.
        </div>
      </div>
    );
  }

  const field = (
    label,
    key,
    options = {}
  ) => {
    const {
      multiline = false,
      readOnly = false,
      type = "text",
    } = options;

    return (
      <label className="profile-field">
        <span>{label}</span>

        {multiline ? (
          <textarea
            value={form[key]}
            onChange={(event) =>
              update(key, event.target.value)
            }
            disabled={!editing || readOnly}
            rows="5"
          />
        ) : (
          <input
            type={type}
            value={form[key]}
            onChange={(event) =>
              update(key, event.target.value)
            }
            disabled={!editing || readOnly}
          />
        )}
      </label>
    );
  };

  return (
    <div className="profile-page">
      <header className="profile-view-header">
        <div>
          <button
            type="button"
            className="profile-back"
            onClick={() =>
              navigate("/cadp-profile")
            }
          >
            ← Back to CADP Profiles
          </button>

          <p>AMIANAN-CADP L.E.N.S.</p>

          <h1>
            {site.convergence_name}
          </h1>

          <span>
            Convergence Area Profile
          </span>
        </div>

        {canEdit && !editing && (
          <button
            type="button"
            className="profile-edit-main"
            onClick={() => setEditing(true)}
          >
            Edit CADP Profile
          </button>
        )}
      </header>

      <main className="profile-page-content">
        {message && (
          <div className="profile-message success">
            {message}
          </div>
        )}

        {errorMessage && (
          <div className="profile-message error">
            {errorMessage}
          </div>
        )}

        <section className="profile-section">
          <div className="profile-section-heading">
            <h2>General Information</h2>
            <p>
              Basic information about the convergence
              area.
            </p>
          </div>

          <div className="profile-form-grid">
            {field(
              "Convergence Type",
              "convergence_type"
            )}

            {field("Region", "region")}

            <label className="profile-field">
              <span>Convergence Area Name</span>
              <input
                value={site.convergence_name || ""}
                disabled
              />
            </label>

            <label className="profile-field">
              <span>Start Year</span>
              <input
                value={site.year_started || ""}
                disabled
              />
            </label>

            {field(
              "Provinces Covered",
              "provinces_covered"
            )}

            {field(
              "Cities / Municipalities Covered",
              "cities_municipalities_covered"
            )}

            <div className="profile-grid-full">
              {field(
                "Barangays Covered",
                "barangays_covered",
                { multiline: true }
              )}
            </div>

            {field(
              "Watershed / Major River Covered",
              "watershed_major_river"
            )}

            {field("Status", "status")}

            {field(
              "Priority Commodities",
              "priority_commodities"
            )}

            {field("End Year", "end_year", {
              type: "number",
            })}
          </div>
        </section>

        <section className="profile-section">
          <div className="profile-section-heading">
            <h2>Strategic Direction</h2>
            <p>
              Vision, mission, goals and objectives.
            </p>
          </div>

          <div className="profile-long-fields">
            {field("Vision", "vision", {
              multiline: true,
            })}

            {field("Mission", "mission", {
              multiline: true,
            })}

            {field("Goals", "goals", {
              multiline: true,
            })}

            {field("Objectives", "objectives", {
              multiline: true,
            })}
          </div>
        </section>

        <section className="profile-section">
          <div className="profile-section-heading">
            <h2>Area Description</h2>
          </div>

          {field(
            "Brief Description",
            "brief_description",
            { multiline: true }
          )}
        </section>

        <section className="profile-section">
          <div className="profile-section-heading">
            <h2>Stakeholders</h2>
          </div>

          <div className="profile-long-fields">
            {field(
              "Existing Agriculture, Forestry and Fisheries (AFF) Enterprises",
              "aff_enterprises",
              { multiline: true }
            )}

            {field(
              "Existing Civil Society Organizations (CSOs)",
              "csos",
              { multiline: true }
            )}
          </div>
        </section>

        <section className="profile-section">
          <div className="profile-section-heading">
            <h2>Biodiversity Conservation Status</h2>
          </div>

          <div className="profile-form-grid">
            {field(
              "Flora Status",
              "flora_status",
              { multiline: true }
            )}

            {field(
              "Fauna Status",
              "fauna_status",
              { multiline: true }
            )}
          </div>
        </section>

        {editing && canEdit && (
          <div className="profile-save-bar">
            <button
              type="button"
              className="profile-cancel-button"
              onClick={() => {
                setEditing(false);
                loadProfile();
              }}
              disabled={saving}
            >
              Cancel
            </button>

            <button
              type="button"
              className="profile-save-button"
              onClick={handleSave}
              disabled={saving}
            >
              {saving
                ? "Saving..."
                : "Save CADP Profile"}
            </button>
          </div>
        )}
      </main>
    </div>
  );
}

export default CADPProfileView;